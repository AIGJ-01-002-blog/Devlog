import { useEffect, useRef, useState } from 'react'
import {
  ACCEPT, type Attachment, checkFile, fileErrorText, fileSize, listFiles, MAX_FILES, move, saveFiles, uploadFile,
} from '../lib/files'
import { t, tNodes } from '../lib/i18n'

interface Uploading { key: number; name: string; error?: string }

function uploadStatus(list: Uploading[]): string {
  const busy = list.filter((u) => !u.error).length
  if (busy > 0) return t('파일 {0}개를 올리는 중이에요', { 0: busy })
  const failed = list.length
  return failed > 0 ? t('파일 {0}개를 올리지 못했어요', { 0: failed }) : ''
}

/**
 * 편집 화면 아래 첨부 목록 (022 US1). 더하기·빼기·순서 바꾸기마다 서버에 바로 저장한다.
 * 저장은 하나씩 차례로 보내고, 실패하면 서버 목록으로 되돌린다.
 */
export function AttachmentEditor({ postId, published }: { postId: number; published: boolean }) {
  const [files, setFiles] = useState<Attachment[] | null>(null)
  const [uploading, setUploading] = useState<Uploading[]>([])
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const current = useRef<Attachment[]>([])
  const seq = useRef(0)
  const pending = useRef(0)

  useEffect(() => {
    let alive = true
    listFiles(postId).then((l) => { if (alive) { current.current = l; setFiles(l) } })
      .catch(() => { if (alive) { current.current = []; setFiles([]) } })
    return () => { alive = false }
  }, [postId])

  /** 화면을 먼저 바꾸고 서버에 저장한다. 앞의 저장이 끝난 뒤에 보낸다. */
  function save(next: Attachment[]) {
    current.current = next
    setFiles(next)
    setError(null)
    queue.current = queue.current.then(async () => {
      try {
        const saved = await saveFiles(postId, next.map((f) => f.id))
        if (current.current === next) { current.current = saved; setFiles(saved) }
      } catch (e) {
        setError(fileErrorText(e))
        const server = await listFiles(postId).catch(() => null)
        if (server) { current.current = server; setFiles(server) }
      }
    })
  }

  async function add(list: FileList | null) {
    if (!list) return
    for (const file of Array.from(list)) {
      const key = ++seq.current
      const problem = checkFile(file, current.current.length + pending.current)
      if (problem) {
        setUploading((u) => [...u, { key, name: file.name, error: problem }])
        continue
      }
      setUploading((u) => [...u, { key, name: file.name }])
      pending.current++
      try {
        const up = await uploadFile(file)
        setUploading((u) => u.filter((x) => x.key !== key))
        save([...current.current, up])
      } catch (e) {
        setUploading((u) => u.map((x) => (x.key === key ? { ...x, error: fileErrorText(e) } : x)))
      } finally {
        pending.current--
      }
    }
  }

  if (files === null) return null
  const count = files.length
  return (
    <section className="attachments attachments-edit" aria-label={t('첨부파일')}>
      <div className="attachments-head">
        <h2>{tNodes('첨부파일 {0}', { 0: <span className="muted">{count}/{MAX_FILES}</span> })}</h2>
        <button type="button" className="btn btn-small" onClick={() => input.current?.click()} disabled={count >= MAX_FILES}>
          
          {t('파일 첨부')}
        </button>
        <input ref={input} type="file" accept={ACCEPT} multiple hidden
               onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
      </div>
      <p className="muted small">{t('pdf, zip, txt, md, csv, docx, xlsx, pptx · 파일 하나 20MB까지')}
        {published && t(' · 발행한 글의 첨부는 바로 바뀌어요')}</p>
      {error && <p className="error small" role="alert">{error}</p>}
      {/* 올리기 진행을 읽어 주는 자리는 늘 두고 글만 바꾼다 */}
      <p className="sr-only" role="status">{uploadStatus(uploading)}</p>
      {(count > 0 || uploading.length > 0) && (
        <ul className="attachment-list">
          {files.map((f, i) => (
            <li key={f.id}>
              <span className="attachment-name" title={f.name}>{f.name}</span>
              <span className="muted small">{fileSize(f.sizeBytes)}</span>
              <span className="attachment-actions">
                <button type="button" className="btn btn-text" aria-label={t('{0} 위로', { 0: f.name })} disabled={i === 0}
                        onClick={() => save(move(files, i, -1))}>↑</button>
                <button type="button" className="btn btn-text" aria-label={t('{0} 아래로', { 0: f.name })} disabled={i === count - 1}
                        onClick={() => save(move(files, i, 1))}>↓</button>
                <button type="button" className="btn btn-text danger" aria-label={t('{0} 빼기', { 0: f.name })}
                        onClick={() => { if (confirm(t('첨부를 뺄까요?'))) save(files.filter((x) => x.id !== f.id)) }}>✕</button>
              </span>
            </li>
          ))}
          {uploading.map((u) => (
            <li key={`u${u.key}`} className={u.error ? 'attachment-failed' : 'attachment-pending'}>
              <span className="attachment-name" title={u.name}>{u.name}</span>
              {u.error ? <span className="error small">{u.error}</span> : <span className="muted small">{t('올리는 중…')}</span>}
              {u.error && (
                <span className="attachment-actions">
                  <button type="button" className="btn btn-text" aria-label={t('{0} 알림 닫기', { 0: u.name })}
                          onClick={() => setUploading((l) => l.filter((x) => x.key !== u.key))}>✕</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
