import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AdminNav } from '../components/AdminNav'
import { Pager } from '../components/Pager'
import { consoleApi, count, MEMBER_STATUS_LABEL, PROVIDER_LABEL, roleLabel, type MemberLine, type Paged } from '../lib/admin'
import { fullDate, relativeDate } from '../lib/format'
import { Link, navigate, useLocation } from '../lib/router'

const ROLES = [
  { code: '', label: '모든 권한' },
  { code: 'STAFF', label: '관리자·매니저' },
  { code: 'USER', label: '일반 회원' },
]

const STATUSES = [
  { code: '', label: '모든 상태' },
  { code: 'ACTIVE', label: '활동 중' },
  { code: 'SUSPENDED', label: '정지' },
  { code: 'WITHDRAWN', label: '탈퇴 신청' },
]

/** 회원 관리 목록 (062): 주소·닉네임으로 찾고 권한·상태로 거른다. 새로 가입한 순. 조건은 주소에 남겨 뒤로 가기로 돌아올 수 있다. */
export function AdminMembersPage() {
  const { search } = useLocation()
  const q = search.get('q') ?? ''
  const role = search.get('role') ?? ''
  const status = search.get('status') ?? ''
  const page = Math.max(1, Number(search.get('page')) || 1)
  const [data, setData] = useState<Paged<MemberLine> | null>(null)
  const [error, setError] = useState(false)
  const [text, setText] = useState(q)
  const key = `${q}|${role}|${status}|${page}`
  const current = useRef(key)
  current.current = key

  useEffect(() => { document.title = '회원 관리 - devlog' }, [])
  useEffect(() => { setText(q) }, [q])
  useEffect(() => {
    setError(false)
    consoleApi.members(q, role, status, page)
      .then((d) => { if (current.current === key) setData(d) })
      .catch(() => { if (current.current === key) setError(true) })
  }, [key, q, role, status, page])

  const go = (next: Partial<Record<'q' | 'role' | 'status' | 'page', string>>) => {
    const p = new URLSearchParams({ q, role, status, page: '1', ...next })
    for (const k of [...p.keys()]) if (!p.get(k) || (k === 'page' && p.get(k) === '1')) p.delete(k)
    const s = p.toString()
    navigate(`/admin/members${s ? `?${s}` : ''}`)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    go({ q: text.trim() })
  }

  return (
    <main className="container admin admin-wide">
      <h1 className="page-title">관리자 페이지</h1>
      <AdminNav />
      <form className="admin-filters" role="search" onSubmit={submit}>
        <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="주소·닉네임" aria-label="회원 찾기" />
        <select value={role} onChange={(e) => go({ role: e.target.value })} aria-label="권한으로 거르기" data-tip="권한으로 거르기">
          {ROLES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
        </select>
        <select value={status} onChange={(e) => go({ status: e.target.value })} aria-label="상태로 거르기" data-tip="상태로 거르기">
          {STATUSES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>
        <button type="submit" className="btn btn-outline" data-tip="주소·닉네임 일부로 찾기">찾기</button>
      </form>
      {error && <p className="error" role="alert">목록을 불러오지 못했어요.</p>}
      {data && <p className="muted small" role="status">회원 {count(data.total)}명</p>}
      {data && data.items.length === 0 && <div className="empty"><p>조건에 맞는 회원이 없어요.</p></div>}
      {data && data.items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th scope="col">회원</th><th scope="col">권한·상태</th><th scope="col" className="num">글</th>
                <th scope="col" className="num">댓글</th><th scope="col">가입</th><th scope="col">최근 활동</th></tr>
            </thead>
            <tbody>
              {data.items.map(({ member: m, posts, drafts, hiddenPosts, comments }) => (
                <tr key={m.id}>
                  <td data-label="회원">
                    <Link to={`/admin/members/${m.handle}`} className="admin-case-title" data-tip="통계·권한·정지 관리">{m.nickname ?? m.handle}</Link>
                    <span className="muted small"> @{m.handle}{m.provider ? ` · ${PROVIDER_LABEL[m.provider] ?? m.provider}` : ''}</span>
                  </td>
                  <td data-label="권한·상태">
                    {m.role !== 'USER' && <span className="badge badge-brand">{roleLabel(m.role)}</span>}{' '}
                    <span className={`badge${m.status === 'ACTIVE' ? '' : ' badge-warn'}`}>{MEMBER_STATUS_LABEL[m.status] ?? m.status}</span>
                  </td>
                  <td data-label="글" className="num" data-tip={`발행 ${posts} · 임시 ${drafts} · 숨김 ${hiddenPosts}`}>{count(posts)}</td>
                  <td data-label="댓글" className="num">{count(comments)}</td>
                  <td data-label="가입"><time dateTime={m.joinedAt}>{fullDate(m.joinedAt)}</time></td>
                  <td data-label="최근 활동">{m.lastActiveAt ? <time dateTime={m.lastActiveAt} title={fullDate(m.lastActiveAt)}>{relativeDate(m.lastActiveAt)}</time> : <span className="muted">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={(p) => go({ page: String(p) })} />}
    </main>
  )
}
