import { useEffect, useState, type FormEvent } from 'react'
import { PasswordRules } from '../components/PasswordRules'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fieldErrors } from '../lib/fieldErrors'
import { passwordOk } from '../lib/password'
import { Link, useLocation } from '../lib/router'

/** 재설정 링크로 새 비밀번호 정하기 (004 US3). 저장하면 모든 기기에서 로그아웃된다. */
export function ResetPasswordPage() {
  const { search } = useLocation()
  const { refresh } = useAuth()
  const token = search.get('token') ?? ''
  const [valid, setValid] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return setValid(false)
    api<{ valid: boolean }>('/api/auth/password/reset-check', { method: 'POST', body: { token } })
      .then((r) => setValid(r.valid))
      .catch(() => setValid(false))
  }, [token])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      await api('/api/auth/password/reset', { method: 'POST', body: { token, password, passwordConfirm: confirm } })
      setDone(true)
      await refresh()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'LINK_EXPIRED') setValid(false)
      else setErrors(fieldErrors(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main className="container narrow auth-page">
        <h1>비밀번호를 바꿨어요</h1>
        <p className="muted">모든 기기에서 로그아웃됐어요. 새 비밀번호로 다시 로그인해 주세요.</p>
        <Link to="/login" className="btn btn-primary btn-block">로그인</Link>
      </main>
    )
  }
  if (valid === false) {
    return (
      <main className="container narrow auth-page">
        <h1>링크가 만료됐어요</h1>
        <p className="muted">이미 쓴 링크이거나 30분이 지났어요. 비밀번호 찾기를 다시 해 주세요.</p>
        <Link to="/forgot-password" className="btn btn-primary btn-block">비밀번호 찾기</Link>
      </main>
    )
  }
  if (valid == null) return <main className="container narrow"><p className="muted center">확인하는 중…</p></main>

  return (
    <main className="container narrow auth-page">
      <h1>새 비밀번호</h1>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>새 비밀번호</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={64} required
                 aria-invalid={!!errors.password} aria-describedby={errors.password ? 'reset-pw-error' : undefined} />
          <PasswordRules password={password} />
          {errors.password && <small id="reset-pw-error" className="error" role="alert">{errors.password}</small>}
        </label>
        <label className="field">
          <span>새 비밀번호 확인</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" maxLength={64} required
                 aria-invalid={!!errors.passwordConfirm || (!!confirm && confirm !== password)}
                 aria-describedby={errors.passwordConfirm || (confirm && confirm !== password) ? 'reset-confirm-error' : undefined} />
          {(errors.passwordConfirm || (confirm && confirm !== password)) && (
            <small id="reset-confirm-error" className="error" role={errors.passwordConfirm ? 'alert' : undefined}>{errors.passwordConfirm ?? '비밀번호가 서로 달라요.'}</small>
          )}
        </label>
        {errors.form && <div className="banner banner-warn" role="alert">{errors.form}</div>}
        <button className="btn btn-primary btn-block" disabled={submitting || !passwordOk(password) || password !== confirm}>
          {submitting ? '저장하는 중…' : '비밀번호 저장'}
        </button>
      </form>
    </main>
  )
}
