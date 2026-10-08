import { useEffect, useState } from 'react'
import { downloadExport, exportErrorText, exportSummary } from '../lib/export'

/**
 * 내 글 내보내기 (056). Crowfoot의 Markdown 내보내기처럼, 내 글을 언제든 들고 나갈 수 있게 한다.
 * 받는 동안 버튼을 막고, 요청 제한(10분 5번)이나 오류는 글로 알린다.
 */
export function ExportSection() {
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    exportSummary().then((r) => setCount(r.posts)).catch(() => setCount(null))
  }, [])

  async function download() {
    setBusy(true)
    setMessage(null)
    try {
      const name = await downloadExport()
      setMessage({ ok: true, text: `${name} 파일을 받았어요.` })
    } catch (e) {
      setMessage({ ok: false, text: exportErrorText(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="settings-section" id="export">
      <h2>내 글 내보내기</h2>
      <p className="muted small">
        휴지통에 없는 내 글{count != null ? ` ${count}개` : ''}를 글마다 Markdown 파일 하나로 묶어 zip으로 받아요.
        제목·날짜·태그·시리즈가 파일 맨 위에 적혀 있어 다른 블로그로 옮기거나 백업하기 좋아요.
      </p>
      <button type="button" className="btn btn-outline" onClick={() => void download()} disabled={busy || count === 0}
              data-tip="발행한 글(posts/)과 임시글(drafts/)을 Markdown zip 파일로 받아요">
        {busy ? '만드는 중…' : '⬇ Markdown으로 내보내기'}
      </button>
      {message && <p className={message.ok ? 'small' : 'error small'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
    </section>
  )
}
