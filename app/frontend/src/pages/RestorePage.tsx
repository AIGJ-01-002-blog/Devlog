import { useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { setFlash } from '../lib/flash'
import { navigate } from '../lib/router'
import { daysLeft, deadline, withdrawApi, type WithdrawalSummary } from '../lib/withdraw'

/**
 * 탈퇴 유예 회원의 유일한 화면 (020 US2). 로그인만으로는 복구하지 않고 [복구하기]를 눌러야 한다(FR-017).
 * [로그아웃]은 로그아웃만 하고 유예는 그대로다(FR-018).
 */
export function RestorePage() {
  const { refresh, logout } = useAuth()
  const [s, setS] = useState<WithdrawalSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = '계정 복구 - devlog'
    withdrawApi.summary().then(setS).catch(() => setError('불러오지 못했어요. 새로고침해 주세요.'))
  }, [])

  const restore = async () => {
    setBusy(true)
    setError(null)
    try {
      await withdrawApi.restore()
      setFlash('다시 오신 걸 환영해요')
      await refresh()
      navigate('/', { replace: true })
    } catch (e) {
      // 다른 기기에서 이미 복구했으면 그대로 홈으로
      if (e instanceof ApiError && e.code === 'NOT_WITHDRAWN') {
        await refresh()
        navigate('/', { replace: true })
        return
      }
      setError(e instanceof ApiError ? e.message : '잠시 후 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  const leave = async () => {
    setBusy(true)
    setError(null)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      setError('로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <main className="container narrow auth-page restore-page center">
      <h1>탈퇴 신청한 계정이에요</h1>
      {s && (
        <>
          <p><b>{deadline(s.restoreBy)}</b>까지 복구할 수 있어요 <span className="nowrap">({daysLeft(s.restoreBy)}일 남음)</span></p>
          <p className="muted">복구하면 블로그·글·댓글이 모두 원래대로 돌아와요.</p>
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="banner-actions restore-actions">
        <button type="button" className="btn btn-outline" onClick={leave} disabled={busy}>로그아웃</button>
        <button type="button" className="btn btn-primary" onClick={restore} disabled={busy || !s}>{busy ? '복구하는 중…' : '복구하기'}</button>
      </div>
    </main>
  )
}
