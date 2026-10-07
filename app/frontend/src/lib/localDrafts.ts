// 이 기기의 작성 데이터 (006, docs/04 §2-2·§2-7). 화면이 멈추지 않게 IndexedDB(비동기)를 쓴다.
// 회원·글별로 나눠 다른 계정·다른 글과 섞이지 않는다. 로그인 정보는 저장하지 않는다.
// IndexedDB를 못 쓰는 환경(사생활 보호 창 등)에서는 모든 동작이 조용히 아무것도 하지 않는다(서버 자동 저장만으로 동작).

const DB_NAME = 'blog-local'
const DB_VERSION = 1
export const BACKUP_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** 기기 작성 데이터: 회원·글별 하나. */
export interface LocalDraft {
  memberId: number
  postId: number
  title: string
  contentMd: string
  /** 이 내용이 출발한 서버 편집 버전 */
  baseVersion: number
  /** 서버로 아직 못 보낸 내용이 있으면 true */
  unsynced: boolean
  /** 본문에 들어간 업로드 대기 사진 임시 표시 (009) */
  pendingImages: string[]
  savedAt: number
}

/** [저장된 내용 불러오기] 때 편집 중이던 내용. 7일 보관. */
export interface LocalBackup {
  memberId: number
  postId: number
  title: string
  contentMd: string
  at: number
}

/** 업로드 대기 사진 원본 (009에서 올린다). */
export interface PendingImage {
  id: string
  memberId: number
  postId: number
  /** 올릴 사진 (이미 줄이고 다시 그린 것) */
  blob: Blob
  /** 목록 카드용 썸네일 */
  thumb?: Blob
  createdAt: number
}

let opening: Promise<IDBDatabase | null> | null = null

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening
  opening = new Promise((resolve) => {
    let req: IDBOpenDBRequest
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      req = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      return resolve(null)
    }
    req.onupgradeneeded = () => {
      const db = req.result
      db.createObjectStore('drafts', { keyPath: ['memberId', 'postId'] }).createIndex('member', 'memberId')
      const backups = db.createObjectStore('backups', { keyPath: ['memberId', 'postId', 'at'] })
      backups.createIndex('member', 'memberId')
      backups.createIndex('post', ['memberId', 'postId'])
      db.createObjectStore('pendingImages', { keyPath: 'id' }).createIndex('member', 'memberId')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return opening
}

type StoreName = 'drafts' | 'backups' | 'pendingImages'

async function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open()
  if (!db) return undefined
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, mode)
      const req = fn(tx.objectStore(store))
      tx.oncomplete = () => resolve(req ? req.result : undefined)
      tx.onerror = () => resolve(undefined)
      tx.onabort = () => resolve(undefined) // 저장 공간 부족 등: 서버 자동 저장으로 계속한다 (A-4)
    } catch {
      resolve(undefined)
    }
  })
}

/** 인덱스로 찾은 것을 모두 지운다. */
async function deleteBy(store: StoreName, index: string, key: IDBValidKey): Promise<void> {
  await run(store, 'readwrite', (s) => {
    const req = s.index(index).openCursor(IDBKeyRange.only(key))
    req.onsuccess = () => {
      const c = req.result
      if (c) {
        c.delete()
        c.continue()
      }
    }
  })
}

export const localDrafts = {
  async get(memberId: number, postId: number): Promise<LocalDraft | null> {
    return (await run<LocalDraft>('drafts', 'readonly', (s) => s.get([memberId, postId]))) ?? null
  },

  async put(draft: LocalDraft): Promise<boolean> {
    const db = await open()
    if (!db) return false
    await run('drafts', 'readwrite', (s) => s.put(draft))
    return true
  },

  async remove(memberId: number, postId: number): Promise<void> {
    await run('drafts', 'readwrite', (s) => s.delete([memberId, postId]))
  },

  async addBackup(backup: LocalBackup): Promise<boolean> {
    const db = await open()
    if (!db) return false
    await run('backups', 'readwrite', (s) => s.put(backup))
    return true
  },

  /** 이 글의 백업, 최근 것부터. 7일 지난 것은 빼고 지운다. */
  async backups(memberId: number, postId: number, now = Date.now()): Promise<LocalBackup[]> {
    const all = (await run<LocalBackup[]>('backups', 'readonly', (s) => s.index('post').getAll([memberId, postId]))) ?? []
    const expired = all.filter((b) => now - b.at > BACKUP_TTL_MS)
    if (expired.length) {
      await run('backups', 'readwrite', (s) => { expired.forEach((b) => s.delete([b.memberId, b.postId, b.at])) })
    }
    return all.filter((b) => now - b.at <= BACKUP_TTL_MS).sort((a, b) => b.at - a.at)
  },

  async removeBackup(b: LocalBackup): Promise<void> {
    await run('backups', 'readwrite', (s) => s.delete([b.memberId, b.postId, b.at]))
  },

  /** 모든 회원의 7일 지난 백업을 지운다 (앱을 열 때). */
  async purgeExpired(now = Date.now()): Promise<void> {
    await run('backups', 'readwrite', (s) => {
      const req = s.openCursor()
      req.onsuccess = () => {
        const c = req.result
        if (!c) return
        if (now - (c.value as LocalBackup).at > BACKUP_TTL_MS) c.delete()
        c.continue()
      }
    })
  },

  async addPendingImage(img: PendingImage): Promise<boolean> {
    const db = await open()
    if (!db) return false
    await run('pendingImages', 'readwrite', (s) => s.put(img))
    return true
  },

  /** 이 글의 업로드 대기 사진 (009 FR-017). */
  async pendingImagesFor(memberId: number, postId: number): Promise<PendingImage[]> {
    const all = (await run<PendingImage[]>('pendingImages', 'readonly', (s) => s.index('member').getAll(memberId))) ?? []
    return all.filter((p) => p.postId === postId)
  },

  async removePendingImage(id: string): Promise<void> {
    await run('pendingImages', 'readwrite', (s) => s.delete(id))
  },

  /** 로그아웃 (FR-017): 그 회원의 작성 데이터·백업·대기 사진을 모두 지운다. */
  async clearMember(memberId: number): Promise<void> {
    await Promise.all([
      deleteBy('drafts', 'member', memberId),
      deleteBy('backups', 'member', memberId),
      deleteBy('pendingImages', 'member', memberId),
    ])
  },

  /** 테스트용: 열린 연결을 버린다. */
  _reset(): void {
    opening = null
  },
}
