import { describe, expect, it } from 'vitest'
import type { LocalDraft } from './localDrafts'
import { decideRestore } from './restore'

const server = { title: '서버', contentMd: '서버 본문', version: 4 }
const local = (o: Partial<LocalDraft>): LocalDraft => ({
  memberId: 1, postId: 1, title: '기기', contentMd: '기기 본문', baseVersion: 4, unsynced: true, pendingImages: [], savedAt: 0, ...o,
})

describe('다시 열 때 기기 내용 판단', () => {
  it('기기 데이터가 없으면 그대로', () => expect(decideRestore(server, null)).toBe('none'))
  it('미전송이 없으면 기기 데이터를 지운다', () => expect(decideRestore(server, local({ unsynced: false }))).toBe('discard'))
  it('서버와 내용이 같으면 지운다 (떠날 때 보낸 저장이 성공한 경우)', () =>
    expect(decideRestore(server, local({ title: '서버', contentMd: '서버 본문', baseVersion: 3 }))).toBe('discard'))
  it('출발 버전이 지금 서버 버전과 같으면 불러온다', () => expect(decideRestore(server, local({}))).toBe('load'))
  it('그 사이 서버가 바뀌었으면 충돌', () => expect(decideRestore(server, local({ baseVersion: 3 }))).toBe('conflict'))
})
