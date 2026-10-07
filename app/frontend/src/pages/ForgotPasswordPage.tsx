import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { Link } from '../lib/router'

/** 비밀번호 찾기 (004 US3): 가입 여부와 상관없이 같은 안내를 보여 준다. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api('/api/auth/password/reset-request', { method: 'POST', body: { email } })
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.fieldError('email') ?? err.message : '잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container narrow auth-page">
      <h1>비밀번호 찾기</h1>
      {sent ? (
        <>
          <div className="banner banner-ok" role="status">가입된 이메일이면 안내 메일을 보냈어요.</div>
          <p className="muted small">메일이 오지 않으면 스팸함을 확인하거나 1분 뒤 다시 요청해 주세요. 링크는 30분 동안 한 번만 쓸 수 있어요.</p>
          <Link to="/login" className="btn btn-outline btn-block">로그인으로</Link>
        </>
      ) : (
        <form className="form" onSubmit={submit}>
          <p className="muted">가입한 이메일을 넣으면 비밀번호를 다시 정할 수 있는 링크를 보내 드려요.</p>
          <label className="field">
            <span>이메일</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} required />
          </label>
          {error && <div className="banner banner-warn" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? '보내는 중…' : '재설정 메일 받기'}</button>
        </form>
      )}
    </main>
  )
}
