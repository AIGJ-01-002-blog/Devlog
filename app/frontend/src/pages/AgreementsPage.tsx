import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fullDate } from '../lib/format'
import { PRIVACY_CHANGES, TERMS_CHANGES } from '../lib/agreementChanges'
import { navigate, useLocation } from '../lib/router'
import { t, tNodes } from '../lib/i18n'

interface Terms { termsVersion: string; termsEffectiveDate: string; privacyVersion: string; privacyEffectiveDate: string }
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
      setError(e instanceof ApiError ? e.message : t('처리하지 못했어요.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container narrow auth-page">
      <h1>{t('약관이 바뀌었어요')}</h1>
      <p className="muted">{t('계속 쓰려면 바뀐 이용약관과 개인정보 처리방침에 동의해 주세요.')}</p>
      {terms && <p className="small">{tNodes('이용약관 {0} 시행 · 개인정보 처리방침 {1} 시행', { 0: effective(terms.termsEffectiveDate), 1: effective(terms.privacyEffectiveDate) })}</p>}
      {terms && <ChangeList terms={terms} />}
      <label className="field"><span><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />  {t('바뀐 약관과 처리방침에 모두 동의해요')}</span></label>
      {error && <div className="banner banner-warn" role="alert">{error}</div>}
      <div className="row">
        <button className="btn btn-primary" disabled={!checked || busy} onClick={agree}>{busy ? t('동의하는 중…') : t('동의하고 계속하기')}</button>
        <button className="btn btn-text" onClick={async () => { await logout(); navigate('/') }}>{t('로그아웃')}</button>
      </div>
    </main>
  )
}

/** 이번 버전에서 바뀐 것 (077). 본문 링크는 새 창으로 열어 동의 화면을 떠나지 않게 한다. */
function ChangeList({ terms }: { terms: Terms }) {
  const items = [
    { doc: t('이용약관'), change: TERMS_CHANGES[terms.termsVersion] },
    { doc: t('개인정보 처리방침'), change: PRIVACY_CHANGES[terms.privacyVersion] },
  ].filter((i) => i.change)
  if (items.length === 0) return null
  return (
    <div className="agreement-changes">
      <h2>{t('바뀐 내용')}</h2>
      <ul>
        {items.map(({ doc, change }) => (
          <li key={doc}>
            <b>{doc}</b>: {change!.what}{' '}
            <a href={change!.href} target="_blank" rel="noopener" title={t('새 창에서 열려요')}>{t('전문 보기')}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
