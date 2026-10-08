import { useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import { fullDate } from '../lib/format'
import {
  adminInquiryApi, ANSWER_MAX, STATUS_HINT, STATUS_LABEL, categoryLabel, releaseLink, type Inquiry, type InquiryStatus,
} from '../lib/inquiry'
import { Link } from '../lib/router'

const STATUSES: InquiryStatus[] = ['RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

/**
 * 문의 처리 (054). 본문은 사용자가 쓴 글자 그대로 보여 준다(HTML로 그리지 않는다).
 * 상태·답변·고친 버전을 한 번에 저장하고, 답변이 새로 붙거나 바뀌면 서버가 회원에게 알린다.
 */
export function AdminInquiryPage({ id }: { id: string }) {
  const [item, setItem] = useState<Inquiry | null>(null)
  const [missing, setMissing] = useState(false)
  const [status, setStatus] = useState<InquiryStatus>('RECEIVED')
  const [answer, setAnswer] = useState('')
  const [fixed, setFixed] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const fill = (i: Inquiry) => {
    setItem(i)
    setStatus(i.status)
    setAnswer(i.answer ?? '')
    setFixed(i.fixedVersion ?? '')
  }

  useEffect(() => {
    document.title = '문의 처리 - devlog'
    adminInquiryApi.detail(Number(id)).then(fill).catch(() => setMissing(true))
  }, [id])

  if (missing) return <main className="container narrow"><p>문의를 찾을 수 없어요.</p><Link to="/admin/inquiries">목록으로</Link></main>
  if (!item) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

  const save = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const willNotify = answer.trim() !== '' && answer.trim() !== (item.answer ?? '')
      fill(await adminInquiryApi.update(item.id, { status, answer, fixedVersion: fixed }))
      setMessage({ ok: true, text: willNotify ? '저장했어요. 회원에게 답변 알림을 보냈어요.' : '저장했어요.' })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '저장하지 못했어요.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container narrow admin">
      <p className="small"><Link to="/admin/inquiries">← 문의 관리</Link></p>
      <h1 className="page-title admin-inquiry-title">{item.title}</h1>
      <div className="admin-case-main">
        <span className="badge">{categoryLabel(item.category)}</span>
        <span className={`badge status-${item.status.toLowerCase()}`} title={STATUS_HINT[item.status]}>{STATUS_LABEL[item.status]}</span>
        {item.source === 'MCP' && <span className="badge" title="연결한 AI가 report_bug로 보낸 신고">AI 신고</span>}
      </div>
      <dl className="admin-inquiry-meta small">
        <dt>번호</dt><dd>#{item.id}</dd>
        <dt>보낸 사람</dt><dd><Link to={`/admin/members/${item.memberHandle}`}>{item.memberNickname} @{item.memberHandle}</Link></dd>
        <dt>접수</dt><dd>{fullDate(item.createdAt)}{item.appVersion && ` · v${item.appVersion}에서`}</dd>
        {item.clientName && <><dt>AI</dt><dd>{item.clientName}</dd></>}
        {item.toolName && <><dt>도구</dt><dd><code>{item.toolName}</code></dd></>}
        {item.pageUrl && <><dt>화면</dt><dd><a href={item.pageUrl} target="_blank" rel="noopener">{item.pageUrl}</a></dd></>}
      </dl>
      <section className="support-content admin-inquiry-content" aria-label="문의 내용">{item.content}</section>

      <section className="admin-inquiry-form">
        <h2>처리</h2>
        <label className="field">
          <span>상태</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as InquiryStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]} — {STATUS_HINT[s]}</option>)}
          </select>
        </label>
        <label className="field">
          <span>고친 버전 <span className="muted small">(예: 1.29.0, 릴리스 노트로 이어져요)</span></span>
          <input value={fixed} onChange={(e) => setFixed(e.target.value)} placeholder="1.29.0" inputMode="decimal" />
        </label>
        {item.fixedVersion && <p className="small"><Link to={releaseLink(item.fixedVersion)}>v{item.fixedVersion} 릴리스 노트 보기</Link></p>}
        <label className="field">
          <span>답변 <span className="muted small">({[...answer].length}/{ANSWER_MAX}, 새로 적으면 회원에게 알림이 가요)</span></span>
          <textarea value={answer} maxLength={ANSWER_MAX} rows={6} onChange={(e) => setAnswer(e.target.value)}
                    placeholder="회원에게 보일 답변" />
        </label>
        {message && <p className={message.ok ? 'ok small' : 'error small'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy} title="상태·고친 버전·답변을 저장해요">
          {busy ? '저장하는 중…' : '저장'}
        </button>
      </section>
    </main>
  )
}
