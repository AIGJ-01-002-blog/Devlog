import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from './api'
import { localDrafts, type PendingImage } from './localDrafts'
import {
  pendingIds, placeholder, prepareImage, removePlaceholder, replacePlaceholder, storageUsage, uploadPostImage,
  type StorageUsage,
} from './postImages'
import { t } from './i18n'

type SetContent = (update: (current: string) => string) => void

/**
 * 에디터 사진 올리기 (009 US1·US2). 사진을 넣으면 본문에 업로드 대기 표시를 넣고 이 기기에 보관한 뒤 바로 올린다.
 * 올라가면 표시를 진짜 주소로 바꾸고, 네트워크·서버 문제로 못 올리면 보관해 두었다가 연결되면 다시 올린다.
 * 받아들일 수 없는 사진(형식·크기·저장 공간)은 표시를 지우고 이유를 알린다.
 */
export function useImageUploads(memberId: number, postId: number, getContent: () => string, setContent: SetContent) {
  /** 업로드 대기 사진 id → 이 기기 사진 주소(미리보기·대체글 창용) */
  const localUrls = useRef(new Map<string, string>())
  const memory = useRef(new Map<string, PendingImage>())
  const inflight = useRef(new Set<string>())
  const [waiting, setWaiting] = useState(0)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<StorageUsage | null>(null)

  const refreshCount = useCallback(() => setWaiting(pendingIds(getContent()).length), [getContent])

  const refreshUsage = useCallback(() => { storageUsage().then(setUsage).catch(() => undefined) }, [])

  const forget = useCallback(async (id: string) => {
    memory.current.delete(id)
    const url = localUrls.current.get(id)
    if (url) URL.revokeObjectURL(url)
    localUrls.current.delete(id)
    await localDrafts.removePendingImage(id)
  }, [])

  const upload = useCallback(async (p: PendingImage) => {
    if (inflight.current.has(p.id) || !p.thumb) return
    inflight.current.add(p.id)
    setUploading((n) => n + 1)
    try {
      const up = await uploadPostImage({ image: p.blob, thumb: p.thumb })
      setContent((c) => replacePlaceholder(c, p.id, up.url))
      await forget(p.id)
      setError(null)
      refreshUsage()
    } catch (e) {
      const rejected = e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429 && e.status !== 401
      if (rejected) {
        // 다시 올려도 같은 결과인 사진: 본문에서 빼고 알린다
        setContent((c) => removePlaceholder(c, p.id))
        await forget(p.id)
        setError((e as ApiError).message)
      } else if (e instanceof ApiError && e.status === 429) {
        setError(e.message) // 하루 장수·분당 제한: 보관해 두고 나중에 다시
      }
      // 그 밖(오프라인·서버 장애)은 조용히 보관한다. 대기 표시가 화면에 남는다
    } finally {
      inflight.current.delete(p.id)
      setUploading((n) => n - 1)
      setTimeout(refreshCount, 0)
    }
  }, [forget, refreshCount, refreshUsage, setContent])

  /** 본문에 남은 대기 사진을 모두 다시 올린다. 본문에서 지운 사진은 보관함에서도 지운다. */
  const retryAll = useCallback(async () => {
    const stored = await localDrafts.pendingImagesFor(memberId, postId)
    stored.forEach((p) => { if (!memory.current.has(p.id)) memory.current.set(p.id, p) })
    const inBody = new Set(pendingIds(getContent()))
    for (const p of memory.current.values()) {
      if (!inBody.has(p.id)) {
        if (!inflight.current.has(p.id)) await forget(p.id)
        continue
      }
      if (!localUrls.current.has(p.id)) localUrls.current.set(p.id, URL.createObjectURL(p.blob))
      void upload(p)
    }
    refreshCount()
  }, [forget, getContent, memberId, postId, refreshCount, upload])

  /** 고르거나 붙여 넣은 사진을 넣는다. insert는 커서 자리에 원문을 넣는다. */
  const add = useCallback(async (files: File[], insert: (text: string) => void) => {
    for (const file of files) {
      let prepared
      try {
        prepared = await prepareImage(file)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('사진을 넣지 못했어요.'))
        continue
      }
      const id = crypto.randomUUID().replaceAll('-', '').slice(0, 16)
      localUrls.current.set(id, URL.createObjectURL(prepared.image))
      const p: PendingImage = { id, memberId, postId, blob: prepared.image, thumb: prepared.thumb, createdAt: Date.now() }
      memory.current.set(id, p)
      insert(placeholder(id) + '\n')
      await localDrafts.addPendingImage(p) // 못 쓰는 환경이면 이 화면에 있는 동안만 보관한다
      void upload(p)
    }
    refreshCount()
  }, [memberId, postId, refreshCount, upload])

  useEffect(() => {
    void retryAll()
    refreshUsage()
    const onOnline = () => void retryAll()
    window.addEventListener('online', onOnline)
    const urls = localUrls.current
    return () => {
      window.removeEventListener('online', onOnline)
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
    }
  }, [])

  return { add, retryAll, refreshCount, localUrls, waiting, uploading, error, clearError: () => setError(null), usage }
}
