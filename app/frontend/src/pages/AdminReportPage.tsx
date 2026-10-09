import { useEffect, useRef, useState } from 'react'
import { AdminNav } from '../components/AdminNav'
import { AuthorPanel } from '../components/AuthorPanel'
import { SuspendFields } from '../components/SuspendForm'
import { ApiError } from '../lib/api'
import { fullDate } from '../lib/format'
import {
  adminApi, REASONS, reasonLabel, reasonSummary, STATUS_LABEL, TARGET_STATE_LABEL,
  type CaseDetail, type ReportReason, type SuspendDays,
} from '../lib/moderation'
import { Link } from '../lib/router'

/**
 * 신고 처리 (019 US2·US3·US4). 신고 시점 스냅샷으로 판단하고, 숨기기(사유) 또는 문제없음으로 대기 신고를 한 번에 닫는다.
 * 정지를 함께 할 수 있다. 처리됨 사건은 [숨김 해제]. 자기 콘텐츠는 처리할 수 없다.
 */
export function AdminReportPage({ id }: { id: string }) {
  const [c, setC] = useState<CaseDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const [action, setAction] = useState<'HIDE' | 'REJECT' | null>(null)
  const [hideReason, setHideReason] = useState<ReportReason | ''>('')
  const [suspend, setSuspend] = useState(false)
  const [days, setDays] = useState<SuspendDays>(7)
  const [suspendReason, setSuspendReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  // 입력 확인 오류는 [처리하기] 바로 위에 보이고 그리로 초점을 옮긴다
  const [invalid, setInvalid] = useState<string | null>(null)
  const invalidRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (invalid) invalidRef.current?.focus() }, [invalid])

  useEffect(() => {
    document.title = '신고 처리 - devlog'
    adminApi.detail(Number(id)).then((d) => {
      setC(d)
      const top = REASONS.map((r) => r.code).sort((a, b) => (d.reasons[b] ?? 0) - (d.reasons[a] ?? 0))[0]
      setHideReason(top)
    }).catch(() => setMissing(true))
  }, [id])

  if (missing) return <main className="container narrow"><p>신고를 찾을 수 없어요.</p><Link to="/admin/reports">목록으로</Link></main>
  if (!c) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

  const canResolve = c.status === 'PENDING' && !c.mine
  const canUnhide = c.status === 'HIDDEN' && c.targetState === 'HIDDEN' && !c.mine

  const run = async (work: () => Promise<CaseDetail>, ok: string) => {
    setBusy(true)
    setMessage(null)
    setInvalid(null)
    try {
      setC(await work())
      setMessage({ ok: true, text: ok })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '처리하지 못했어요.' })
      // 숨김·반려는 끝났고 정지만 실패했을 수 있어 지금 상태를 다시 읽는다
      adminApi.detail(c.caseId).then(setC).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  const resolve = () => {
    if (!action) return setInvalid('처리 방법을 골라 주세요.')
    if (action === 'HIDE' && !hideReason) return setInvalid('숨기는 사유를 골라 주세요.')
    if (suspend && !suspendReason.trim()) return setInvalid('정지 사유를 적어 주세요.')
    void run(() => adminApi.resolve(c.caseId, action, action === 'HIDE' ? (hideReason as ReportReason) : null,
      suspend ? { days, reason: suspendReason.trim() } : null), action === 'HIDE' ? '숨겼어요.' : '문제없음으로 처리했어요.')
  }

  return (
    <main className="container narrow admin">
      <AdminNav />
      <p><Link to="/admin/reports">← 신고 목록</Link></p>
      <h1 className="page-title">{c.targetType === 'POST' ? '글' : '댓글'} 신고 <span className="badge">{STATUS_LABEL[c.status]}</span></h1>

      <section className="admin-section">
        <h2>대상</h2>
        <p>
          지금 상태: <b>{TARGET_STATE_LABEL[c.targetState]}</b>
          {c.hiddenReason && ` (사유: ${reasonLabel(c.hiddenReason)})`}
          {c.link && <> · <a href={c.link}>주소 열기</a></>}
        </p>
        <p className="muted small">비공개·휴지통이 된 원문은 열 수 없어요. 아래는 첫 신고 때 복사한 내용이에요.</p>
        <div className="snapshot">
          {c.snapshotTitle && <h3>{c.snapshotTitle}</h3>}
          {c.snapshotContent != null ? <pre>{c.snapshotContent}</pre> : <p className="muted">보관 기간이 지나 내용을 비웠어요.</p>}
        </div>
      </section>

      <section className="admin-section">
        <h2>신고 {c.reports.length}건</h2>
        <p>{reasonSummary(c.reasons)}</p>
        <ul className="report-lines">
          {c.reports.filter((r) => r.detail).map((r, i) => (
            <li key={i}><span className="muted small">{fullDate(r.at)}</span> {r.detail}</li>
          ))}
        </ul>
      </section>

      <AuthorPanel author={c.author} />

      {c.mine && <p className="banner">내 글·댓글에 대한 신고라 처리할 수 없어요.</p>}

      {canResolve && (
        <section className="admin-section">
          <h2>처리</h2>
          <fieldset className="field">
            <legend>처리 방법</legend>
            <label><input type="radio" name="action" checked={action === 'HIDE'} onChange={() => setAction('HIDE')} /> 숨기기</label>
            <label><input type="radio" name="action" checked={action === 'REJECT'} onChange={() => setAction('REJECT')} /> 문제없음 (신고 반려)</label>
          </fieldset>
          {action === 'HIDE' && (
            <label className="field">
              <span>숨기는 사유 (작성자에게 보여요)</span>
              <select value={hideReason} onChange={(e) => setHideReason(e.target.value as ReportReason)}>
                {REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </label>
          )}
          {!c.author.admin && !c.author.suspended && (
            <label className="check"><input type="checkbox" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} /> 작성자도 정지하기</label>
          )}
          {suspend && <SuspendFields days={days} reason={suspendReason} onChange={(d, r) => { setDays(d); setSuspendReason(r) }} />}
          {invalid && <p ref={invalidRef} className="error" role="alert" tabIndex={-1}>{invalid}</p>}
          <button type="button" className="btn btn-primary" onClick={resolve} disabled={busy}>{busy ? '처리 중…' : '처리하기'}</button>
        </section>
      )}

      {canUnhide && (
        <section className="admin-section">
          <h2>숨김 해제</h2>
          <p className="muted small">원래대로 돌아오고 작성자에게 알리지 않아요.</p>
          <button type="button" className="btn btn-outline" disabled={busy}
                  onClick={() => run(() => adminApi.unhide(c.caseId), '숨김을 해제했어요.')}>숨김 해제</button>
        </section>
      )}

      {message && <p className={message.ok ? 'banner banner-ok' : 'error'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
    </main>
  )
}
