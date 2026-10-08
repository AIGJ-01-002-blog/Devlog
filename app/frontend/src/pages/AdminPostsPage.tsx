import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AdminNav } from '../components/AdminNav'
import { Pager } from '../components/Pager'
import { consoleApi, count, POST_FILTERS, type Paged, type PostFilter, type PostLine } from '../lib/admin'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { REASONS, type ReportReason } from '../lib/moderation'
import { Link, navigate, useLocation } from '../lib/router'

/**
 * 글 관리 (062): 발행한 글을 제목·작성자로 찾고 공개·비공개·숨김으로 거른다. 공개 글은 바로 숨길 수 있고(작성자에게 알림),
 * 숨긴 글은 다시 풀 수 있다. 비공개 글은 관리자에게도 제목을 보여 주지 않는다.
 */
export function AdminPostsPage() {
  const { search } = useLocation()
  const { me } = useAuth()
  const q = search.get('q') ?? ''
  const author = search.get('author') ?? ''
  const filter = (POST_FILTERS.find((f) => f.code === search.get('filter'))?.code ?? 'all') as PostFilter
  const page = Math.max(1, Number(search.get('page')) || 1)
  const [data, setData] = useState<Paged<PostLine> | null>(null)
  const [error, setError] = useState(false)
  const [text, setText] = useState(q)
  const [hiding, setHiding] = useState<number | null>(null)
  const [reason, setReason] = useState<ReportReason>('SPAM')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const key = `${q}|${author}|${filter}|${page}`
  const current = useRef(key)
  current.current = key

  useEffect(() => { document.title = '글 관리 - devlog' }, [])
  useEffect(() => { setText(q) }, [q])
  const load = useCallback(() => {
    setError(false)
    consoleApi.posts(q, filter, author, page)
      .then((d) => { if (current.current === key) setData(d) })
      .catch(() => { if (current.current === key) setError(true) })
  }, [key, q, filter, author, page])
  useEffect(load, [load])

  const go = (next: Partial<Record<'q' | 'author' | 'filter' | 'page', string>>) => {
    const p = new URLSearchParams({ q, author, filter, page: '1', ...next })
    for (const k of [...p.keys()]) if (!p.get(k) || (k === 'page' && p.get(k) === '1') || (k === 'filter' && p.get(k) === 'all')) p.delete(k)
    const s = p.toString()
    navigate(`/admin/posts${s ? `?${s}` : ''}`)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    go({ q: text.trim() })
  }
  const act = async (work: () => Promise<void>, ok: string) => {
    setMessage(null)
    try {
      await work()
      setMessage({ ok: true, text: ok })
      setHiding(null)
      load()
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '처리하지 못했어요.' })
    }
  }

  return (
    <main className="container admin admin-wide">
      <h1 className="page-title">관리자 페이지</h1>
      <AdminNav />
      <form className="admin-filters" role="search" onSubmit={submit}>
        <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="제목·작성자 주소" aria-label="글 찾기" />
        <button type="submit" className="btn btn-outline" data-tip="공개 글의 제목이나 작성자 주소 일부로 찾기">찾기</button>
      </form>
      <nav className="tabs" aria-label="글 거르기">
        {POST_FILTERS.map((f) => (
          <button key={f.code} type="button" aria-selected={f.code === filter} onClick={() => go({ filter: f.code })}>{f.label}</button>
        ))}
      </nav>
      {author && (
        <p className="muted small">@{author}의 글만 보는 중 · <button type="button" className="btn btn-text" onClick={() => go({ author: '' })}>모든 글 보기</button></p>
      )}
      {message && <p className={message.ok ? 'banner banner-ok' : 'error'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
      {error && <p className="error" role="alert">목록을 불러오지 못했어요.</p>}
      {data && <p className="muted small" role="status">글 {count(data.total)}편</p>}
      {data && data.items.length === 0 && <div className="empty"><p>조건에 맞는 글이 없어요.</p></div>}
      <ul className="admin-cases">
        {data?.items.map((p) => (
          <li key={p.id} className="admin-case">
            <div className="admin-case-main">
              {p.hidden && <span className="badge badge-warn">숨김</span>}
              {p.visibility !== 'PUBLIC' && <span className="badge">{p.visibility === 'FRIENDS' ? '친구 공개' : '비공개'}</span>}
              {p.title !== null
                ? <a href={p.link} className="admin-case-title">{p.title}</a>
                : <span className="muted" data-tip="비공개 글은 관리자도 제목과 본문을 보지 않아요">(비공개 글)</span>}
            </div>
            <div className="muted small">
              <Link to={`/admin/members/${p.authorHandle}`} data-tip="작성자 통계·관리 보기">@{p.authorHandle}</Link>
              {' '}· 조회 {count(p.views)} · 좋아요 {count(p.likes)} · 댓글 {count(p.comments)}
            </div>
            {p.visibility === 'PUBLIC' && p.authorHandle !== me?.member?.handle && (
              <div className="admin-case-actions">
                {p.hidden ? (
                  <button type="button" className="btn btn-outline btn-small" data-tip="숨김을 풀어 다시 보이게 해요(작성자에게 알리지 않아요)"
                          onClick={() => act(() => consoleApi.unhidePost(p.id), '숨김을 풀었어요.')}>숨김 해제</button>
                ) : hiding === p.id ? (
                  <form className="hide-form" onSubmit={(e) => { e.preventDefault(); void act(() => consoleApi.hidePost(p.id, reason), '글을 숨겼어요. 작성자에게 알림이 가요.') }}>
                    <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} aria-label="숨기는 사유">
                      {REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                    </select>
                    <button type="submit" className="btn btn-danger btn-small">숨기기</button>
                    <button type="button" className="btn btn-text btn-small" onClick={() => setHiding(null)}>취소</button>
                  </form>
                ) : (
                  <button type="button" className="btn btn-outline btn-small" data-tip="독자에게 보이지 않게 숨기고 작성자에게 알려요"
                          onClick={() => { setHiding(p.id); setMessage(null) }}>숨기기…</button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {data && <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={(n) => go({ page: String(n) })} />}
    </main>
  )
}
