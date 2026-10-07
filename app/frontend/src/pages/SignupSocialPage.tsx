import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { navigate } from '../lib/router'

interface Terms { termsVersion: string; termsEffectiveDate: string; privacyVersion: string; privacyEffectiveDate: string }
interface Draft { provider: string; prefix: string; handleBody: string; nickname: string; email: string; avatarUrl: string | null; terms: Terms }
interface Check { available: boolean; message: string | null; suggestion?: string | null }

/** 소셜 가입 마무리 (docs/08·09): 접두어 고정 + 본문 입력, 0.5초 뒤 중복 확인, 닉네임, 약관 동의. */
export function SignupSocialPage() {
  const { refresh } = useAuth()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [expired, setExpired] = useState(false)
  const [body, setBody] = useState('')
  const [nickname, setNickname] = useState('')
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [handleCheck, setHandleCheck] = useState<Check | null>(null)
  const [nickCheck, setNickCheck] = useState<Check | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const timers = useRef<{ h?: number; n?: number }>({})

  useEffect(() => {
    api<Draft>('/api/auth/signup').then((d) => {
      setDraft(d)
      setBody(d.handleBody)
      setNickname(d.nickname ?? '')
    }).catch(() => setExpired(true))
  }, [])

  useEffect(() => {
    if (!draft || !body) return setHandleCheck(null)
    clearTimeout(timers.current.h)
    timers.current.h = window.setTimeout(() => {
      api<Check>(`/api/handles/availability?handle=${encodeURIComponent(draft.prefix + body)}`).then(setHandleCheck).catch(() => setHandleCheck(null))
    }, 500)
  }, [body, draft])

  useEffect(() => {
    if (!nickname) return setNickCheck(null)
    clearTimeout(timers.current.n)
    timers.current.n = window.setTimeout(() => {
      api<Check>(`/api/nicknames/availability?nickname=${encodeURIComponent(nickname)}`).then(setNickCheck).catch(() => setNickCheck(null))
    }, 500)
  }, [nickname])

  if (expired) {
    return (
      <main className="container narrow auth-page">
        <h1>가입 시간이 지났어요</h1>
        <p className="muted">GitHub 로그인부터 다시 시작해 주세요.</p>
        <a className="btn btn-primary" href="/login">로그인으로</a>
      </main>
    )
  }
  if (!draft) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      const r = await api<{ handle: string; redirect: string }>('/api/auth/signup', {
        method: 'POST', body: { handleBody: body, nickname, agreeTerms: terms, agreePrivacy: privacy },
      })
      await refresh()
      navigate(r.redirect || '/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SIGNUP_EXPIRED') return setExpired(true)
        const map: Record<string, string> = {}
        err.errors.forEach((f) => (map[f.field] = f.message))
        if (err.code === 'HANDLE_TAKEN') {
          const s = (err.details as { suggestion?: string } | null)?.suggestion
          map.handleBody = `이미 쓰는 주소예요.${s ? ` "${s}"는 어때요?` : ''}`
        } else if (err.code === 'NICKNAME_TAKEN') map.nickname = err.message
        else if (!err.errors.length) map.form = err.message
        setErrors(map)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container narrow auth-page">
      <h1>가입 마무리</h1>
      <p className="muted">블로그 주소는 가입 뒤 바꿀 수 없어요.</p>
      <form onSubmit={submit} className="form">
        <label className="field">
          <span>블로그 주소</span>
          <div className="input-prefix">
            <span>devlog/@{draft.prefix}</span>
            <input value={body} onChange={(e) => setBody(e.target.value.toLowerCase())} maxLength={20}
                   autoComplete="off" spellCheck={false} aria-describedby="handle-help" required />
          </div>
          <small id="handle-help" className={errors.handleBody || handleCheck?.available === false ? 'error' : 'muted'}>
            {errors.handleBody ?? (handleCheck == null ? '영문 소문자·숫자·_ 3~20자' : handleCheck.available ? '쓸 수 있는 주소예요.'
              : `${handleCheck.message}${handleCheck.suggestion ? ` "${handleCheck.suggestion}"는 어때요?` : ''}`)}
          </small>
          {handleCheck?.suggestion && !handleCheck.available && (
            <button type="button" className="btn btn-text" onClick={() => setBody(handleCheck.suggestion!)}>추천 주소 쓰기</button>
          )}
        </label>
        <label className="field">
          <span>닉네임</span>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={10} required />
          <small className={errors.nickname || nickCheck?.available === false ? 'error' : 'muted'}>
            {errors.nickname ?? (nickCheck == null ? '2~10자' : nickCheck.available ? '쓸 수 있는 닉네임이에요.' : nickCheck.message)}
          </small>
        </label>
        <fieldset className="field agreements">
          <label><input type="checkbox" checked={terms && privacy} onChange={(e) => { setTerms(e.target.checked); setPrivacy(e.target.checked) }} /> <b>모두 동의</b></label>
          <label><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> (필수) 이용약관 ({draft.terms.termsEffectiveDate} 시행)</label>
          <label><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> (필수) 개인정보 처리방침 ({draft.terms.privacyEffectiveDate} 시행)</label>
          {(errors.agreeTerms || errors.agreePrivacy) && <small className="error">{errors.agreeTerms ?? errors.agreePrivacy}</small>}
        </fieldset>
        {errors.form && <div className="banner banner-warn" role="alert">{errors.form}</div>}
        <button className="btn btn-primary btn-block" disabled={submitting || !terms || !privacy}>
          {submitting ? '가입하는 중…' : '가입하기'}
        </button>
      </form>
    </main>
  )
}
