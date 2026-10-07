import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { clock, fullDate, monthDay, relativeDate } from '../lib/format'
import { Link, navigate, useLocation } from '../lib/router'
import type { ManageItem, ManagePage as Page, Visibility } from '../lib/types'

type Tab = 'drafts' | 'published'

/** 내 글 관리 (docs/41): 임시글·발행 글 탭, 20개씩 [더 보기], 공개 범위 즉시 변경, 변경 취소. 휴지통은 007. */
export function ManagePage() {
  const { search } = useLocation()
  const tab: Tab = search.get('tab') === 'published' ? 'published' : 'drafts'
  const filter = search.get('visibility')
  const [items, setItems] = useState<ManageItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [counts, setCounts] = useState<Page['counts']>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  const query = `tab=${tab}${filter ? `&visibility=${filter}` : ''}`
  const load = useCallback(async (next: string | null) => {
    setLoading(true)
    try {
      const page = await api<Page>(`/api/me/posts?${query}${next ? `&cursor=${encodeURIComponent(next)}` : ''}`)
      setItems((prev) => {
        const base = next ? prev : []
        const seen = new Set(base.map((i) => i.id))
        return [...base, ...page.items.filter((i) => !seen.has(i.id))]
      })
      setCursor(page.nextCursor)
      if (page.counts) setCounts(page.counts)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => { void load(null) }, [load])

  const go = (t: Tab, v?: string) => navigate(`/manage/posts?tab=${t}${v ? `&visibility=${v}` : ''}`)

  const changeVisibility = async (item: ManageItem, to: Visibility) => {
    if (to === 'PUBLIC' && !confirm('모든 사람이 볼 수 있게 돼요. 공개할까요?')) return
    try {
      await api(`/api/posts/${item.id}/visibility`, { method: 'PATCH', body: { visibility: to } })
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, visibility: to } : i)))
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : '바꾸지 못했어요.')
    }
  }

  const discard = async (item: ManageItem) => {
    if (!confirm('수정 중인 내용을 버리고 발행본으로 돌아갈까요?')) return
    await api(`/api/posts/${item.id}/draft`, { method: 'DELETE' })
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, editing: false } : i)))
    setNotice('변경을 취소했어요.')
  }

  return (
    <main className="container narrow">
      <div className="row space-between">
        <h1 className="page-title">내 글 관리</h1>
        <Link to="/write" className="btn btn-primary">새 글</Link>
      </div>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'drafts'} onClick={() => go('drafts')}>임시글 {counts?.drafts ?? ''}</button>
        <button type="button" role="tab" aria-selected={tab === 'published'} onClick={() => go('published')}>발행 글 {counts?.published ?? ''}</button>
      </div>
      {tab === 'published' && (
        <div className="filters">
          {[['', '전체'], ['public', '공개'], ['private', '비공개']].map(([v, label]) => (
            <button key={v} type="button" className={`chip ${(filter ?? '') === v ? 'active' : ''}`} onClick={() => go('published', v)}>{label}</button>
          ))}
        </div>
      )}
      {notice && <div className="banner banner-ok" role="status">{notice}</div>}
      <ul className="manage-list">
        {items.map((item) => (
          <li key={item.id} className="manage-item">
            <div className="manage-main">
              {item.status === 'PUBLISHED' && (
                <span className="vis" title={item.visibility === 'PUBLIC' ? '공개' : '비공개'}>
                  {item.visibility === 'PUBLIC' ? '🌐' : '🔒'}<span className="sr-only">{item.visibility === 'PUBLIC' ? '공개' : '비공개'}</span>
                </span>
              )}
              <span className={item.title ? 'manage-title' : 'manage-title muted'}>{item.title || '(제목 없음)'}</span>
              {item.editing && <span className="badge">수정 중</span>}
              {item.hidden && <span className="badge badge-warn">운영 정책에 따라 숨겨짐</span>}
            </div>
            <div className="manage-meta muted small">
              {item.status === 'DRAFT'
                ? <>마지막 저장 {isRecent(item.updatedAt) ? relativeDate(item.updatedAt) : `${monthDay(item.updatedAt)} ${clock(item.updatedAt)}`}</>
                : <>발행 {item.publishedAt && fullDate(item.publishedAt)}{item.editedAt && ` · 수정됨 ${monthDay(item.editedAt)}`} · 👁 {item.viewCount} ♥ {item.likeCount} 💬 {item.commentCount}</>}
            </div>
            <div className="manage-actions">
              {item.status === 'DRAFT' ? (
                <Link to={`/write/${item.id}`} className="btn btn-text">이어 쓰기</Link>
              ) : (
                <>
                  <ViewLink id={item.id} />
                  <Link to={`/write/${item.id}`} className="btn btn-text">{item.editing ? '이어서 수정' : '수정'}</Link>
                  {item.editing && <button type="button" className="btn btn-text" onClick={() => discard(item)}>변경 취소</button>}
                  <select aria-label="공개 범위" value={item.visibility ?? 'PUBLIC'}
                          onChange={(e) => changeVisibility(item, e.target.value as Visibility)}>
                    <option value="PUBLIC">공개</option>
                    <option value="PRIVATE">비공개</option>
                  </select>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!loading && items.length === 0 && (
        <div className="empty">
          {tab === 'drafts' ? <p>임시글이 없어요.</p> : <p>발행한 글이 없어요.</p>}
          <Link to="/write" className="btn btn-primary">새 글 쓰기</Link>
        </div>
      )}
      {cursor && (
        <div className="more"><button type="button" className="btn btn-outline" disabled={loading} onClick={() => load(cursor)}>더 보기</button></div>
      )}
    </main>
  )
}

function ViewLink({ id }: { id: number }) {
  // 글 주소는 서버가 /@handle/posts/{id}로 정한다. 상세 API에서 주소를 받아 이동한다
  return (
    <button type="button" className="btn btn-text" onClick={async () => {
      const p = await api<{ url: string }>(`/api/posts/${id}`)
      navigate(p.url)
    }}>보기</button>
  )
}

function isRecent(iso: string) {
  return Date.now() - new Date(iso).getTime() < 86_400_000
}
