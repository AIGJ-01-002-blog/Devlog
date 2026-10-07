import { useEffect, useState } from 'react'
import { AuthorPanel } from '../components/AuthorPanel'
import { SuspendForm } from '../components/SuspendForm'
import { ApiError } from '../lib/api'
import { adminApi, type AuthorInfo } from '../lib/moderation'
import { Link } from '../lib/router'

/** 회원 관리 (019 US4): 정지·해제와 이력. 관리자는 다른 관리자나 자신을 정지할 수 없다. */
export function AdminMemberPage({ handle }: { handle: string }) {
  const [m, setM] = useState<AuthorInfo | null>(null)
  const [missing, setMissing] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    document.title = '회원 관리 - devlog'
    adminApi.member(handle).then(setM).catch(() => setMissing(true))
  }, [handle])

  if (missing) return <main className="container narrow"><p>회원을 찾을 수 없어요.</p></main>
  if (!m) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

  const act = async (work: () => Promise<AuthorInfo>, ok: string) => {
    setMessage(null)
    try {
      setM(await work())
      setMessage({ ok: true, text: ok })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '처리하지 못했어요.' })
    }
  }

  return (
    <main className="container narrow admin">
      <p><Link to="/admin/reports">← 신고 목록</Link> · <a href={`/@${m.handle}`}>블로그 보기</a></p>
      <h1 className="page-title">회원 관리</h1>
      <AuthorPanel author={m} linkToMember={false} />
      {m.suspended ? (
        <section className="admin-section">
          <h2>정지 해제</h2>
          <button type="button" className="btn btn-outline" onClick={() => act(() => adminApi.lift(m.handle), '정지를 해제했어요.')}>정지 해제</button>
        </section>
      ) : !m.admin && (
        <section className="admin-section">
          <h2>정지</h2>
          <p className="muted small">정지하면 모든 기기에서 바로 로그아웃되고, 기한까지 로그인할 수 없어요. 글·댓글은 그대로 보여요.</p>
          <SuspendForm onSubmit={(days, reason) => act(() => adminApi.suspend(m.handle, days, reason), '정지했어요.')} />
        </section>
      )}
      {message && <p className={message.ok ? 'banner banner-ok' : 'error'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
    </main>
  )
}
