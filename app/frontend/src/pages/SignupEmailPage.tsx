import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PasswordRules } from '../components/PasswordRules'
import { SignupAgreements, type AgreementChecks } from '../components/SignupAgreements'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fieldErrors } from '../lib/fieldErrors'
import { cleanHandleInput, passwordOk } from '../lib/password'
import { Link, navigate, useLocation } from '../lib/router'

interface Terms { termsEffectiveDate: string; privacyEffectiveDate: string }
interface Check { available: boolean; message: string | null; suggestion?: string | null }

/**
 * 이메일 가입 (004 US1, docs/08 §3): 이메일을 치는 동안 주소를 미리 채우고, 주소를 직접 고치면 더는 바꾸지 않는다.
 * 비밀번호는 규칙별 ✓로 보여 주고, 최종 검사는 서버가 한다.
 */
export function SignupEmailPage() {
  const { me, refresh } = useAuth()
  const { search } = useLocation()
  const redirect = search.get('redirect') ?? '/'
  const [terms, setTermsInfo] = useState<Terms | null>(null)
  const [email, setEmail] = useState('')
  const [body, setBody] = useState('')
  const [bodyTouched, setBodyTouched] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [agreed, setAgreed] = useState<AgreementChecks>({ terms: false, privacy: false, ai: false })
  const [handleCheck, setHandleCheck] = useState<Check | null>(null)
  const [nickCheck, setNickCheck] = useState<Check | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [emailTaken, setEmailTaken] = useState(false)
  const [withdrawnAccount, setWithdrawnAccount] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const timers = useRef<{ s?: number; h?: number; n?: number }>({})

  useEffect(() => {
    if (me?.authenticated) navigate('/', { replace: true })
  }, [me])

  useEffect(() => {
    api<Terms>('/api/terms/current').then(setTermsInfo).catch(() => undefined)
  }, [])

  // 이메일 앞부분으로 주소 미리 채우기 (주소 칸을 직접 고친 뒤로는 하지 않는다)
  useEffect(() => {
    if (bodyTouched) return
    const at = email.indexOf('@')
    const local = (at < 0 ? email : email.slice(0, at)).trim()
    clearTimeout(timers.current.s)
    if (!local) {
      setBody('')
      setAutoFilled(false)
      return
    }
    timers.current.s = window.setTimeout(() => {
      api<{ handleBody: string }>(`/api/handles/suggestion?material=${encodeURIComponent(local)}`)
        .then((r) => { setBody(r.handleBody); setAutoFilled(true) })
        .catch(() => undefined)
    }, 400)
  }, [email, bodyTouched])

  useEffect(() => {
    if (!body) return setHandleCheck(null)
    clearTimeout(timers.current.h)
    timers.current.h = window.setTimeout(() => {
      api<Check>(`/api/handles/availability?handle=${encodeURIComponent(body)}`).then(setHandleCheck).catch(() => setHandleCheck(null))
    }, 500)
  }, [body])

  useEffect(() => {
    if (!nickname) return setNickCheck(null)
    clearTimeout(timers.current.n)
    timers.current.n = window.setTimeout(() => {
      api<Check>(`/api/nicknames/availability?nickname=${encodeURIComponent(nickname)}`).then(setNickCheck).catch(() => setNickCheck(null))
    }, 500)
  }, [nickname])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setEmailTaken(false)
    setWithdrawnAccount(false)
    try {
      await api('/api/auth/redirect', { method: 'POST', body: { redirect } })
      const r = await api<{ handle: string; redirect: string }>('/api/auth/signup/email', {
        method: 'POST',
        body: { email, handleBody: body, password, passwordConfirm: confirm, nickname, agreeTerms: agreed.terms, agreePrivacy: agreed.privacy, agreeAi: agreed.ai },
      })
      await refresh()
      navigate(r.redirect || '/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        setEmailTaken(true)
      } else if (err instanceof ApiError && err.code === 'WITHDRAWN_ACCOUNT') {
        setWithdrawnAccount(true)
      } else if (err instanceof ApiError && err.code === 'HANDLE_TAKEN') {
        const s = (err.details as { suggestion?: string } | null)?.suggestion
        setErrors({ handleBody: `이미 쓰는 주소예요.${s ? ` "${s}"는 어때요?` : ''}` })
      } else if (err instanceof ApiError && err.code === 'NICKNAME_TAKEN') {
        setErrors({ nickname: err.message })
      } else {
        setErrors(fieldErrors(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const ready = agreed.terms && agreed.privacy && passwordOk(password, email) && password === confirm && body.length >= 3

  return (
    <main className="container narrow auth-page">
      <h1>이메일로 가입</h1>
      <form onSubmit={submit} className="form" noValidate>
        <label className="field">
          <span>이메일</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254}
                 autoComplete="email" required aria-invalid={!!errors.email || emailTaken || withdrawnAccount} />
          {errors.email && <small className="error">{errors.email}</small>}
          {withdrawnAccount && (
            <div className="banner banner-warn" role="alert">
              탈퇴 신청한 계정이 있어요. 로그인하면 복구할 수 있어요.
              <div className="banner-actions">
                <Link to="/login" className="btn btn-outline">로그인</Link>
              </div>
            </div>
          )}
          {emailTaken && (
            <div className="banner banner-warn" role="alert">
              이미 가입된 이메일이에요.
              <div className="banner-actions">
                <Link to="/login" className="btn btn-outline">로그인</Link>
                <Link to="/forgot-password" className="btn btn-outline">비밀번호 찾기</Link>
              </div>
            </div>
          )}
        </label>
        <label className="field">
          <span>블로그 주소</span>
          <div className="input-prefix">
            <span>devlog/@</span>
            <input value={body} lang="en" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                   onChange={(e) => { setBody(cleanHandleInput(e.target.value)); setBodyTouched(true); setAutoFilled(false) }}
                   maxLength={20} autoComplete="off" aria-describedby="handle-help" required />
          </div>
          <small id="handle-help" className={errors.handleBody || handleCheck?.available === false ? 'error' : 'muted'}>
            {errors.handleBody ?? (handleCheck == null ? '영문 소문자·숫자·_ 3~20자' : handleCheck.available ? '쓸 수 있는 주소예요.'
              : `${handleCheck.message}${handleCheck.suggestion ? ` "${handleCheck.suggestion}"는 어때요?` : ''}`)}
          </small>
          {autoFilled && <small className="muted">이메일 앞부분으로 미리 채웠어요. 이메일을 드러내고 싶지 않으면 바꿔 주세요.</small>}
          <small className="muted">블로그 주소는 가입 후 바꿀 수 없어요.</small>
          {handleCheck?.suggestion && !handleCheck.available && (
            <button type="button" className="btn btn-text" onClick={() => { setBody(handleCheck.suggestion!); setBodyTouched(true) }}>추천 주소 쓰기</button>
          )}
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={64}
                 autoComplete="new-password" aria-describedby="pw-rules" required />
          <PasswordRules password={password} email={email} id="pw-rules" />
          {errors.password && <small className="error">{errors.password}</small>}
        </label>
        <label className="field">
          <span>비밀번호 확인</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} maxLength={64} autoComplete="new-password" required />
          {(errors.passwordConfirm || (confirm && confirm !== password)) && (
            <small className="error">{errors.passwordConfirm ?? '비밀번호가 서로 달라요.'}</small>
          )}
        </label>
        <label className="field">
          <span>닉네임</span>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={10} required />
          <small className={errors.nickname || nickCheck?.available === false ? 'error' : 'muted'}>
            {errors.nickname ?? (nickCheck == null ? '한글·영문·숫자 2~10자' : nickCheck.available ? '쓸 수 있는 닉네임이에요.' : nickCheck.message)}
          </small>
        </label>
        <SignupAgreements value={agreed} onChange={setAgreed} termsDate={terms?.termsEffectiveDate}
                          privacyDate={terms?.privacyEffectiveDate} error={errors.agreeTerms ?? errors.agreePrivacy} />
        {errors.form && <div className="banner banner-warn" role="alert">{errors.form}</div>}
        <button className="btn btn-primary btn-block" disabled={submitting || !ready}>{submitting ? '가입하는 중…' : '가입하기'}</button>
        <p className="muted small">가입하면 인증 메일을 보내요. 메일의 링크를 눌러야 글을 쓸 수 있어요.</p>
      </form>
      <p className="auth-links small">이미 계정이 있나요? <Link to="/login">로그인</Link></p>
    </main>
  )
}
