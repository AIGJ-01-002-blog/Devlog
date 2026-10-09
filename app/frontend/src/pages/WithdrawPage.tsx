import { useEffect, useId, useState, type FormEvent } from 'react'
import { clearLocalData, useAuth } from '../lib/auth'
import { Link, navigate } from '../lib/router'
import { CONFIRM_TEXT, deadline, withdrawApi, withdrawErrorText, withdrawReady, type WithdrawalSummary } from '../lib/withdraw'

/**
 * 회원 탈퇴 (020 US1): 한 화면에 ① 잃게 되는 것과 확인 체크 → ② 본인 확인 → [탈퇴하기].
 * 탈퇴 사유는 묻지 않는다(FR-004). [탈퇴하기]는 빨간색이지만 처음 초점을 받지 않는다(FR-005).
 */
export function WithdrawPage() {
  const { me, refresh } = useAuth()
  const [s, setS] = useState<WithdrawalSummary | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ field: string; text: string } | null>(null)
  const checkId = useId()

  useEffect(() => {
    document.title = '회원 탈퇴 - devlog'
    withdrawApi.summary().then(setS).catch(() => setLoadError(true))
  }, [])

  if (loadError) return <main className="container narrow"><p className="error center" role="alert">불러오지 못했어요. 새로고침해 주세요.</p></main>
  if (!s) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

  const ready = withdrawReady(s.method, checked, password, confirmText)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await withdrawApi.withdraw(s.method === 'PASSWORD' ? password : null, s.method === 'CONFIRM_TEXT' ? confirmText : null)
      // 서버가 모든 기기의 세션을 지웠다. 로그인 필요 화면이 로그인으로 보내기 전에 완료 화면으로 먼저 옮기고,
      // 이 브라우저의 임시 글 데이터도 로그아웃처럼 지운다 (FR-014)
      const id = me?.member?.id
      navigate(`/withdrawn?until=${encodeURIComponent(r.restoreBy)}`, { replace: true })
      await clearLocalData(id)
      await refresh()
    } catch (err) {
      setError(withdrawErrorText(err))
      setBusy(false)
    }
  }

  return (
    <main className="container narrow withdraw-page">
      <h1 className="page-title">회원 탈퇴</h1>
      {s.admin && <div className="banner banner-warn" role="alert">관리자 권한을 해제한 뒤 탈퇴할 수 있어요.</div>}
      <form onSubmit={submit} noValidate>
        <section className="settings-section">
          <h2>① 탈퇴하면 이렇게 돼요</h2>
          <ul className="withdraw-facts">
            <li>블로그 <b>@{s.handle}</b>와 글 <b>{s.posts}개</b>가 바로 다른 사람에게 보이지 않아요.</li>
            <li>남의 글에 쓴 댓글 <b>{s.comments}개</b>는 "탈퇴한 사용자의 댓글이에요"로 가려져요.</li>
            <li><b>{deadline(s.restoreBy)}</b>까지 다시 로그인하면 모두 복구할 수 있어요.</li>
            <li>30일이 지나면 글·사진·받은 좋아요 <b>{s.likesReceived}개</b>가 완전히 삭제되어 되돌릴 수 없어요.
              답글이 달린 댓글은 내용 없이 자리만 남아요.</li>
            <li>블로그 주소 <b>@{s.handle}</b>는 다른 사람도, 나도 다시 쓸 수 없어요.</li>
          </ul>
          {s.posts > 0 && (
            <p className="small">글을 간직하고 싶다면 먼저 <Link to="/settings#export">설정 › 내 글 내보내기</Link>에서 Markdown으로 받아 두세요.</p>
          )}
          <label className="check" htmlFor={checkId}>
            <input id={checkId} type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> 위 내용을 확인했어요
          </label>
        </section>
        <section className="settings-section">
          <h2>② 본인 확인</h2>
          {s.method === 'PASSWORD' ? (
            <label className="field">
              <span>현재 비밀번호</span>
              <input type="password" value={password} maxLength={64} autoComplete="current-password"
                     onChange={(e) => { setPassword(e.target.value); setError(null) }} aria-invalid={error?.field === 'password'}
                     aria-describedby={error?.field === 'password' ? 'withdraw-error' : undefined} />
              {error?.field === 'password' && <small id="withdraw-error" className="error" role="alert">{error.text}</small>}
            </label>
          ) : (
            <label className="field">
              <span>확인을 위해 "{CONFIRM_TEXT}"를 입력해 주세요</span>
              <input value={confirmText} maxLength={10} autoComplete="off" placeholder={CONFIRM_TEXT}
                     onChange={(e) => { setConfirmText(e.target.value); setError(null) }} aria-invalid={error?.field === 'confirmText'}
                     aria-describedby={error?.field === 'confirmText' ? 'withdraw-error' : undefined} />
              {error?.field === 'confirmText' && <small id="withdraw-error" className="error" role="alert">{error.text}</small>}
            </label>
          )}
        </section>
        {error?.field === 'form' && <div className="banner banner-warn" role="alert">{error.text}</div>}
        <div className="withdraw-actions">
          <button type="button" className="btn btn-text" onClick={() => navigate('/settings')}>취소</button>
          <button type="submit" className="btn btn-danger" disabled={!ready || busy || s.admin}>{busy ? '탈퇴하는 중…' : '탈퇴하기'}</button>
        </div>
      </form>
    </main>
  )
}
