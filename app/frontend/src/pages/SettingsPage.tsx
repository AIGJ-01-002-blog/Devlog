import { useState, type FormEvent } from 'react'
import { PasswordRules } from '../components/PasswordRules'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fieldErrors } from '../lib/fieldErrors'
import { fullDate } from '../lib/format'
import { passwordOk } from '../lib/password'

export function SettingsPage() {
  const { me, refresh } = useAuth()
  const [nickname, setNickname] = useState(me?.member?.nickname ?? '')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  if (!me?.member) return null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const r = await api<{ nickname: string; nextChangeableAt: string | null }>('/api/me/nickname', { method: 'PATCH', body: { nickname } })
      await refresh()
      setMessage({ ok: true, text: r.nextChangeableAt ? `바꿨어요. ${fullDate(r.nextChangeableAt)}부터 다시 바꿀 수 있어요.` : '저장했어요.' })
    } catch (err) {
      if (err instanceof ApiError) {
        const next = (err.details as { nextChangeableAt?: string } | null)?.nextChangeableAt
        setMessage({ ok: false, text: next ? `${err.message} (${fullDate(next)}부터 가능)` : err.fieldError('nickname') ?? err.message })
      }
    }
  }

  return (
    <main className="container narrow">
      <h1 className="page-title">설정</h1>
      <section className="settings-section">
        <h2>블로그 주소</h2>
        <p>@{me.member.handle} <span className="muted small">(바꿀 수 없어요)</span></p>
      </section>
      <section className="settings-section">
        <h2>닉네임</h2>
        <form onSubmit={save} className="row">
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={10} aria-label="닉네임" />
          <button className="btn btn-primary" disabled={nickname === me.member.nickname}>저장</button>
        </form>
        <p className="muted small">한 번 바꾸면 30일 동안 다시 바꿀 수 없어요.</p>
        {message && <p className={message.ok ? 'ok' : 'error'} role="status">{message.text}</p>}
      </section>
      {me.previousLogin?.provider === 'LOCAL' && <PasswordSection />}
    </main>
  )
}

/** 비밀번호 변경 (004 US5): 이메일 가입자만. 바꾸면 다른 기기는 로그아웃되고 알림 메일이 간다. */
function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setDone(false)
    try {
      await api('/api/me/password', { method: 'PUT', body: { currentPassword: current, password, passwordConfirm: confirm } })
      setDone(true)
      setCurrent('')
      setPassword('')
      setConfirm('')
    } catch (err) {
      setErrors(fieldErrors(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="settings-section">
      <h2>비밀번호</h2>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>현재 비밀번호</span>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
          {errors.currentPassword && <small className="error">{errors.currentPassword}</small>}
        </label>
        <label className="field">
          <span>새 비밀번호</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={64} required />
          <PasswordRules password={password} />
          {errors.password && <small className="error">{errors.password}</small>}
        </label>
        <label className="field">
          <span>새 비밀번호 확인</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" maxLength={64} required />
          {(errors.passwordConfirm || (confirm && confirm !== password)) && <small className="error">{errors.passwordConfirm ?? '비밀번호가 서로 달라요.'}</small>}
        </label>
        {errors.form && <p className="error" role="alert">{errors.form}</p>}
        {done && <p className="ok" role="status">비밀번호를 바꿨어요. 다른 기기에서는 로그아웃됐어요.</p>}
        <div><button className="btn btn-primary" disabled={submitting || !current || !passwordOk(password) || password !== confirm}>비밀번호 변경</button></div>
      </form>
    </section>
  )
}
