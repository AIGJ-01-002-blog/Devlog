import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fullDate } from '../lib/format'

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
    </main>
  )
}
