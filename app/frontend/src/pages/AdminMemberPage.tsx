import { useEffect, useState } from 'react'
import { AdminNav } from '../components/AdminNav'
import { AuthorPanel } from '../components/AuthorPanel'
import { BarChart } from '../components/BarChart'
import { SuspendForm } from '../components/SuspendForm'
import { consoleApi, count, MEMBER_STATUS_LABEL, PROVIDER_LABEL, roleLabel, type MemberDetail, type Role } from '../lib/admin'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fullDate, relativeDate } from '../lib/format'
import { adminApi, type AuthorInfo } from '../lib/moderation'
import { Link } from '../lib/router'

/**
 * 회원 관리 (019 US4, 062): 작성 통계(발행·임시·받은 조회수·좋아요·달별 글 수·많이 본 글), 권한, 정지·해제와 이력.
 * 권한은 관리자만 바꾸고(매니저는 볼 수만 있다), 관리자·매니저와 자기 자신은 정지할 수 없다.
 */
export function AdminMemberPage({ handle }: { handle: string }) {
  const { me } = useAuth()
  const [m, setM] = useState<AuthorInfo | null>(null)
  const [stats, setStats] = useState<MemberDetail | null>(null)
  const [missing, setMissing] = useState(false)
  // 결과는 누른 버튼 가까이에 보인다: 권한 칸 또는 정지 칸
  const [message, setMessage] = useState<{ ok: boolean; text: string; at: 'role' | 'suspend' | 'purge' } | null>(null)
  const [purged, setPurged] = useState(false)
  const [role, setRole] = useState<Role>('USER')

  useEffect(() => {
    document.title = '회원 관리 - devlog'
    adminApi.member(handle).then(setM).catch(() => setMissing(true))
    consoleApi.memberStats(handle).then((s) => { setStats(s); setRole(s.member.role) }).catch(() => setStats(null))
  }, [handle])

  if (missing) return <main className="container narrow admin"><AdminNav /><p>회원을 찾을 수 없어요.</p></main>
  if (!m) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

  const fail = (e: unknown, at: 'role' | 'suspend' | 'purge') => setMessage({ ok: false, at, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '처리하지 못했어요.' })
  const act = async (work: () => Promise<AuthorInfo>, ok: string) => {
    setMessage(null)
    try {
      setM(await work())
      setMessage({ ok: true, text: ok, at: 'suspend' })
    } catch (e) {
      fail(e, 'suspend')
    }
  }
  const saveRole = async () => {
    if (!confirm(`${roleLabel(role)}(으)로 바꿀까요? 그 회원은 모든 기기에서 로그아웃돼요.`)) return
    setMessage(null)
    try {
      const r = await consoleApi.setRole(m.handle, role)
      setStats((s) => (s ? { ...s, member: { ...s.member, role: r.role } } : s))
      setM(await adminApi.member(m.handle))
      setMessage({ ok: true, text: `${roleLabel(r.role)}(으)로 바꿨어요. 그 회원은 다시 로그인하면 새 권한을 받아요.`, at: 'role' })
    } catch (e) {
      fail(e, 'role')
    }
  }

  const purge = async () => {
    if (!confirm(`@${m.handle} 회원을 지금 바로 정리할까요?\n글·댓글·좋아요·로그인 수단이 지워지고 되돌릴 수 없어요. 블로그 주소는 계속 예약돼요.`)) return
    setMessage(null)
    try {
      await consoleApi.purgeWithdrawn(m.handle)
      setPurged(true)
      setMessage({ ok: true, at: 'purge', text: '정리했어요. 같은 소셜 계정으로 오면 새로 가입해요.' })
    } catch (e) {
      fail(e, 'purge')
    }
  }

  const iAmAdmin = me?.member?.role === 'ADMIN'
  const self = me?.member?.handle === m.handle
  const currentRole = stats?.member.role ?? (m.role as Role | undefined) ?? 'USER'
  const result = (at: 'role' | 'suspend' | 'purge') => message?.at === at && (
    <p className={message.ok ? 'banner banner-ok' : 'error'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>
  )
  return (
    <main className="container narrow admin">
      <h1 className="page-title">관리자 페이지</h1>
      <AdminNav />
      <p className="small"><Link to="/admin/members">← 회원 목록</Link> · <a href={`/@${m.handle}`}>블로그 보기</a> · <Link to={`/admin/posts?author=${m.handle}`} data-tip="이 회원이 발행한 글만 보기">글 보기</Link></p>
      <AuthorPanel author={m} linkToMember={false} />

      {stats && (
        <section className="admin-section">
          <h2>작성 통계</h2>
          <p className="muted small">
            {PROVIDER_LABEL[stats.member.provider ?? ''] ?? '로그인 방식 없음'} 가입 · {MEMBER_STATUS_LABEL[stats.member.status] ?? stats.member.status}
            {stats.member.lastActiveAt && <> · 최근 활동 <time dateTime={stats.member.lastActiveAt} title={fullDate(stats.member.lastActiveAt)}>{relativeDate(stats.member.lastActiveAt)}</time></>}
          </p>
          <div className="stat-grid compact">
            <div className="stat-tile static" data-tip={`공개 ${stats.posts.publicPosts}편, 나머지는 비공개·숨김`}><span className="stat-label">발행한 글</span><span className="stat-value">{count(stats.posts.published)}</span></div>
            <div className="stat-tile static"><span className="stat-label">임시글</span><span className="stat-value">{count(stats.posts.drafts)}</span></div>
            <div className="stat-tile static"><span className="stat-label">숨겨진 글</span><span className="stat-value">{count(stats.posts.hidden)}</span></div>
            <div className="stat-tile static"><span className="stat-label">쓴 댓글</span><span className="stat-value">{count(stats.comments)}</span></div>
            <div className="stat-tile static" data-tip="발행한 글 전체가 받은 조회수"><span className="stat-label">받은 조회수</span><span className="stat-value">{count(stats.viewsReceived)}</span></div>
            <div className="stat-tile static"><span className="stat-label">받은 좋아요</span><span className="stat-value">{count(stats.likesReceived)}</span></div>
          </div>
          <div className="admin-card">
            <BarChart title="달별 새 글" unit="편" points={stats.monthly.map((x) => {
              const [y, mo] = x.month.split('-').map(Number)
              return { label: `${mo}월`, fullLabel: `${y}년 ${mo}월`, value: x.posts }
            })} />
          </div>
          {stats.topPosts.length > 0 && (
            <>
              <h3 className="small">많이 본 글</h3>
              <ol className="rank-list">
                {stats.topPosts.map((p) => (
                  <li key={p.id}>
                    {p.title !== null ? <a href={p.link} className="rank-title">{p.title}</a>
                      : <span className="muted" data-tip="비공개 글은 관리자도 제목을 보지 않아요">(비공개 글)</span>}
                    {p.hidden && <span className="badge badge-warn">숨김</span>}
                    <span className="muted small">조회 {count(p.views)} · 좋아요 {count(p.likes)} · 댓글 {count(p.comments)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}

      <section className="admin-section">
        <h2>권한</h2>
        {currentRole === 'ADMIN' ? (
          <p className="muted small">관리자 계정이에요. 관리자는 운영자 계정 하나로 정해져 있어요.</p>
        ) : iAmAdmin && !self ? (
          <div className="role-form">
            <p className="muted small">매니저는 관리자 페이지에서 글·신고·회원·문의를 관리하지만 권한은 주지 못해요. 바꾸면 그 회원은 모든 기기에서 로그아웃돼요.</p>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="권한 고르기">
              <option value="USER">일반 회원</option>
              <option value="MANAGER">매니저</option>
            </select>{' '}
            <button type="button" className="btn btn-outline" disabled={role === currentRole} onClick={saveRole}
                    data-tip="고른 권한으로 바꿔요">권한 바꾸기</button>
          </div>
        ) : (
          <p className="muted small">지금 권한: {roleLabel(currentRole)}. 권한은 관리자만 바꿀 수 있어요.</p>
        )}
        {result('role')}
      </section>

      {m.suspended ? (
        <section className="admin-section">
          <h2>정지 해제</h2>
          <button type="button" className="btn btn-outline" onClick={() => act(() => adminApi.lift(m.handle), '정지를 해제했어요.')}>정지 해제</button>
        </section>
      ) : !m.admin && !self && stats?.member.status !== 'WITHDRAWN' && (
        <section className="admin-section">
          <h2>정지</h2>
          <p className="muted small">정지하면 모든 기기에서 바로 로그아웃되고, 기한까지 로그인할 수 없어요. 글·댓글은 그대로 보여요.</p>
          <SuspendForm onSubmit={(days, reason) => act(() => adminApi.suspend(m.handle, days, reason), '정지했어요.')} />
        </section>
      )}
      {result('suspend')}

      {stats?.member.status === 'WITHDRAWN' && iAmAdmin && (
        <section className="admin-section">
          <h2>탈퇴 회원 바로 정리</h2>
          <p className="muted small">
            탈퇴 신청 후 30일이 지나면 자동으로 정리돼요. 본인이 바로 지워 달라고 했을 때만 기다리지 않고 지금 정리하세요.
            글·댓글·좋아요·로그인 수단이 지워지고 되돌릴 수 없어요.
          </p>
          <button type="button" className="btn btn-danger" disabled={purged} onClick={purge}
                  data-tip="유예 기간을 기다리지 않고 지금 정리해요. 되돌릴 수 없어요">지금 정리하기</button>
          {result('purge')}
        </section>
      )}
    </main>
  )
}
