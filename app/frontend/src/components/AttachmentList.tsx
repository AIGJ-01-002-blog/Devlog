import { useEffect, useState } from 'react'
import { type Attachment, downloadUrl, fileSize, listFiles } from '../lib/files'

/** 글 본문 아래 첨부 목록 (022 US2). 첨부가 없으면 아무것도 그리지 않는다. */
export function AttachmentList({ postId }: { postId: number }) {
  const [files, setFiles] = useState<Attachment[]>([])

  useEffect(() => {
    let alive = true
    listFiles(postId).then((l) => { if (alive) setFiles(l) }).catch(() => { if (alive) setFiles([]) })
    return () => { alive = false }
  }, [postId])

  if (files.length === 0) return null
  return (
    <section className="attachments" aria-label="첨부파일">
      <h2>첨부파일 <span className="muted">{files.length}</span></h2>
      <ul className="attachment-list">
        {files.map((f) => (
          <li key={f.id}>
            <a className="attachment-name" href={downloadUrl(postId, f.id)} title={f.name}><span aria-hidden="true">📎</span> {f.name}</a>
            <span className="muted small">{fileSize(f.sizeBytes)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
