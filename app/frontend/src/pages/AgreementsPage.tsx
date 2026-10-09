import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fullDate } from '../lib/format'
import { navigate, useLocation } from '../lib/router'

interface Terms { termsEffectiveDate: string; privacyEffectiveDate: string }
// 시행일은 날짜만 온다(2026-10-01). 그대로 읽으면 UTC 자정이라 시간대에 따라 하루 밀리므로 그 지역의 자정으로 읽는다
const effective = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? fullDate(`${d}T00:00:00`) : d)

/** 약관·처리방침 버전이 바뀌었을 때의 재동의 (docs/07 §3-1). 동의 전에는 다른 요청이 막힌다. */
export function AgreementsPage() {
  const { search } = useLocation()
  const { refresh, logout } = useAuth()
  const [terms, setTerms] = useState<Terms | null>(null)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Terms>('/api/terms/current').then(setTerms).catch(() => undefined)
  }, [])

  const agree = async () => {
    setBusy(true)
    setError(null)
    try {
      await api('/api/auth/agreements', { method: 'POST', body: { agreeTerms: true, agreePrivacy: true } })
      await refresh()
      const r = search.get('redirect') ?? '/'
      navigate(r.startsWith('/') && !r.startsWith('//') ? r : '/', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '처리하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container narrow auth-page">
      <h1>약관이 바뀌었어요</h1>
      <p className="muted">계속 쓰려면 바뀐 이용약관과 개인정보 처리방침에 동의해 주세요.</p>
      {terms && <p className="small">이용약관 {effective(terms.termsEffectiveDate)} 시행 · 개인정보 처리방침 {effective(terms.privacyEffectiveDate)} 시행</p>}
      <label className="field"><span><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> 바뀐 약관과 처리방침에 모두 동의해요</span></label>
      {error && <div className="banner banner-warn" role="alert">{error}</div>}
      <div className="row">
        <button className="btn btn-primary" disabled={!checked || busy} onClick={agree}>{busy ? '동의하는 중…' : '동의하고 계속하기'}</button>
        <button className="btn btn-text" onClick={async () => { await logout(); navigate('/') }}>로그아웃</button>
      </div>
    </main>
  )
}
