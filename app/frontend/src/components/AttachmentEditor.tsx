import { useEffect, useRef, useState } from 'react'
import {
  ACCEPT, type Attachment, checkFile, fileErrorText, fileSize, listFiles, MAX_FILES, move, saveFiles, uploadFile,
} from '../lib/files'

interface Uploading { key: number; name: string; error?: string }

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
    <section className="attachments attachments-edit" aria-label="첨부파일">
      <div className="attachments-head">
        <h2>첨부파일 <span className="muted">{count}/{MAX_FILES}</span></h2>
        <button type="button" className="btn btn-small" onClick={() => input.current?.click()} disabled={count >= MAX_FILES}>
          파일 첨부
        </button>
        <input ref={input} type="file" accept={ACCEPT} multiple hidden
               onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
      </div>
      <p className="muted small">pdf, zip, txt, md, csv, docx, xlsx, pptx · 파일 하나 20MB까지
        {published && ' · 발행한 글의 첨부는 바로 바뀌어요'}</p>
      {error && <p className="error small" role="alert">{error}</p>}
      {(count > 0 || uploading.length > 0) && (
        <ul className="attachment-list">
          {files.map((f, i) => (
            <li key={f.id}>
              <span className="attachment-name" title={f.name}>{f.name}</span>
              <span className="muted small">{fileSize(f.sizeBytes)}</span>
              <span className="attachment-actions">
                <button type="button" className="btn btn-text" aria-label={`${f.name} 위로`} disabled={i === 0}
                        onClick={() => save(move(files, i, -1))}>↑</button>
                <button type="button" className="btn btn-text" aria-label={`${f.name} 아래로`} disabled={i === count - 1}
                        onClick={() => save(move(files, i, 1))}>↓</button>
                <button type="button" className="btn btn-text danger" aria-label={`${f.name} 빼기`}
                        onClick={() => save(files.filter((x) => x.id !== f.id))}>✕</button>
              </span>
            </li>
          ))}
          {uploading.map((u) => (
            <li key={`u${u.key}`} className={u.error ? 'attachment-failed' : 'attachment-pending'}>
              <span className="attachment-name" title={u.name}>{u.name}</span>
              {u.error ? <span className="error small">{u.error}</span> : <span className="muted small">올리는 중…</span>}
              {u.error && (
                <span className="attachment-actions">
                  <button type="button" className="btn btn-text" aria-label={`${u.name} 알림 닫기`}
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
