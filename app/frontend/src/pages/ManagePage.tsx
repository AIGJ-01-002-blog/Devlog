import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { clock, fullDate, monthDay, relativeDate } from '../lib/format'
import { useAuth } from '../lib/auth'
import { Link, navigate, useLocation } from '../lib/router'
import { daysLeft, purgePost, PURGE_CONFIRM, restorePost, TRASH_CONFIRM, trashedMessage, trashPost } from '../lib/trash'
import type { ManageItem, ManagePage as Page, Visibility } from '../lib/types'
import { VISIBILITY_ICON, VISIBILITY_LABEL } from '../lib/visibility'
import { InfiniteLoader } from '../components/InfiniteLoader'
import { AiProposals } from '../components/AiProposals'
import { NavIcon, type IconName } from '../components/NavIcons'
import { coverGlyph, coverTone } from '../components/PostCard'

type Tab = 'drafts' | 'published' | 'trash'
type CountKey = keyof NonNullable<Page['counts']>

/** 내 글 관리 (docs/41): 임시글·발행 글·휴지통 탭, 20개씩 무한 스크롤(spec 069), 공개 범위 즉시 변경, 변경 취소, 삭제·복구 (007). */
export function ManagePage() {
  const { search } = useLocation()
  const { me } = useAuth()
  const raw = search.get('tab')
  const tab: Tab = raw === 'published' || raw === 'trash' ? raw : 'drafts'
  const filter = search.get('visibility')
  const [items, setItems] = useState<ManageItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [counts, setCounts] = useState<Page['counts']>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ ok: boolean; text: string; link?: { to: string; label: string } } | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)

  const query = `tab=${tab}${filter ? `&visibility=${filter}` : ''}`
  // 탭을 빨리 바꾸면 늦게 끝난 이전 요청이 지금 탭의 목록·오류를 덮지 않게 마지막 요청만 반영한다
  const latest = useRef(0)
  const load = useCallback(async (next: string | null) => {
    const req = ++latest.current
    setLoading(true)
    setLoadError(false)
    try {
      const page = await api<Page>(`/api/me/posts?${query}${next ? `&cursor=${encodeURIComponent(next)}` : ''}`)
      if (req !== latest.current) return
      setItems((prev) => {
        const base = next ? prev : []
        const seen = new Set(base.map((i) => i.id))
        return [...base, ...page.items.filter((i) => !seen.has(i.id))]
      })
      setCursor(page.nextCursor)
      if (page.counts) setCounts(page.counts)
    } catch {
      if (req !== latest.current) return
      // 다른 탭의 목록이 남아 이 탭의 글처럼 보이지 않게 비운다
      if (!next) setItems([])
      setLoadError(true)
    } finally {
      if (req === latest.current) setLoading(false)
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
      setNotice({ ok: false, text: e instanceof ApiError ? e.message : '바꾸지 못했어요.' })
    }
  }

  const discard = async (item: ManageItem) => {
    if (!confirm('수정 중인 내용을 버리고 발행본으로 돌아갈까요?')) return
    try {
      await api(`/api/posts/${item.id}/draft`, { method: 'DELETE' })
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, editing: false } : i)))
      setNotice({ ok: true, text: '변경을 취소했어요.' })
    } catch (e) {
      setNotice({ ok: false, text: e instanceof ApiError ? e.message : '변경을 취소하지 못했어요. 잠시 뒤 다시 시도해 주세요.' })
    }
  }

  /** 목록 전체를 다시 읽지 않고 그 행과 개수만 고친다. */
  const removeRow = (item: ManageItem, from: CountKey, to?: CountKey) => {
    setItems((list) => list.filter((i) => i.id !== item.id))
    setCounts((c) => c && { ...c, [from]: Math.max(0, c[from] - 1), ...(to ? { [to]: c[to] + 1 } : {}) })
  }
  const homeTab = (item: ManageItem): CountKey => (item.status === 'DRAFT' ? 'drafts' : 'published')

  const act = async (item: ManageItem, fn: () => Promise<void>) => {
    setBusy(item.id)
    try {
      await fn()
    } catch (e) {
      // 이미 다른 탭에서 처리된 글이면 목록에서만 뺀다
      if (e instanceof ApiError && e.status === 404) {
        removeRow(item, tab === 'trash' ? 'trash' : homeTab(item))
        setNotice({ ok: true, text: '이미 처리된 글이에요.' })
      } else {
        setNotice({ ok: false, text: e instanceof ApiError ? e.message : '처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.' })
      }
    } finally {
      setBusy(null)
    }
  }

  const remove = (item: ManageItem) => {
    if (!confirm(TRASH_CONFIRM)) return
    void act(item, async () => {
      const r = await trashPost(item.id, me?.member?.id)
      removeRow(item, homeTab(item), r.result === 'DELETED_EMPTY' ? undefined : 'trash')
      setNotice({ ok: true, text: trashedMessage(r) })
    })
  }

  const restore = (item: ManageItem) => void act(item, async () => {
    const r = await restorePost(item.id)
    const to: CountKey = r.status === 'DRAFT' ? 'drafts' : 'published'
    removeRow(item, 'trash', to)
    setNotice({ ok: true, text: '복구했어요.', link: { to: `/manage/posts?tab=${to}`, label: to === 'drafts' ? '임시글 탭에서 보기' : '발행 글 탭에서 보기' } })
  })

  const purge = (item: ManageItem) => {
    if (!confirm(PURGE_CONFIRM)) return
    void act(item, async () => {
      await purgePost(item.id)
      removeRow(item, 'trash')
      setNotice({ ok: true, text: '완전히 삭제했어요.' })
    })
  }

  const tabs: { id: Tab; label: string; hint: string; icon: IconName }[] = [
    { id: 'drafts', label: '임시글', hint: '아직 발행하지 않은 글', icon: 'pen' },
    { id: 'published', label: '발행 글', hint: '발행한 글과 공개 범위', icon: 'posts' },
    { id: 'trash', label: '휴지통', hint: '지운 글은 30일 뒤 완전히 지워져요', icon: 'trash' },
  ]
  return (
    <main className="container manage-page">
      <header className="manage-head">
        <div>
          <h1 className="page-title">내 글 관리</h1>
          <p className="muted">임시글을 이어 쓰고, 발행한 글의 공개 범위를 바꾸고, 지운 글을 되살려요.</p>
        </div>
        <Link to="/write" className="btn btn-primary btn-lg" data-tip="새 글 쓰기"><NavIcon name="pen" size={16} />새 글</Link>
      </header>
      {/* 탭처럼 보이지만 주소만 바꾸는 버튼이라 tab 역할 대신 눌림 상태로 알린다 */}
      <div className="manage-stats" role="group" aria-label="글 상태">
        {tabs.map((t) => (
          <button key={t.id} type="button" aria-pressed={tab === t.id} className={`manage-stat stat-${t.id}`}
                  data-tip={t.hint} onClick={() => go(t.id)}>
            <span className="manage-stat-icon"><NavIcon name={t.icon} size={18} /></span>
            <span className="manage-stat-label">{t.label}</span>
            <b className="manage-stat-count">{counts ? counts[t.id] : '–'}</b>
          </button>
        ))}
      </div>
      {tab === 'drafts' && <AiProposals />}
      {tab === 'trash' && <p className="muted small">휴지통의 글은 30일이 지나면 완전히 지워져요. 다른 사람에게는 보이지 않아요.</p>}
      {tab === 'published' && (
        <div className="filters">
          {[['', '전체'], ['public', '공개'], ['friends', '친구에게만'], ['private', '비공개']].map(([v, label]) => (
            <button key={v} type="button" aria-pressed={(filter ?? '') === v} className={`chip ${(filter ?? '') === v ? 'active' : ''}`} onClick={() => go('published', v)}>{label}</button>
          ))}
        </div>
      )}
      {notice && (
        <div className={notice.ok ? 'banner banner-ok' : 'banner banner-warn'} role={notice.ok ? 'status' : 'alert'}>
          {notice.text}
          {notice.link && <Link to={notice.link.to} className="btn btn-text">{notice.link.label}</Link>}
        </div>
      )}
      <ul className="manage-list">
        {items.map((item) => (
          <li key={item.id} className={`manage-item${item.hidden ? ' is-hidden' : ''}`}>
            <span className={`manage-cover card-cover`} data-tone={coverTone(item.id)} aria-hidden="true">
              <span>{coverGlyph(item.title || '#')}</span>
            </span>
            <div className="manage-body">
              <div className="manage-main">
                <StatusChip item={item} trash={tab === 'trash'} />
                {item.editing && <span className="badge">수정 중</span>}
                {item.hidden && <span className="badge badge-warn">운영 정책에 따라 숨겨짐</span>}
              </div>
              <span className={item.title ? 'manage-title' : 'manage-title muted'}>{item.title || '(제목 없음)'}</span>
              <div className="manage-meta">
                {tab === 'trash' && item.deletedAt && item.purgeAt
                  ? <>삭제 {monthDay(item.deletedAt)} · {daysLeft(item.purgeAt)}일 뒤 완전 삭제</>
                  : item.status === 'DRAFT'
                  ? <>마지막 저장 {isRecent(item.updatedAt) ? relativeDate(item.updatedAt) : `${monthDay(item.updatedAt)} ${clock(item.updatedAt)}`}</>
                  : <>
                    <span>발행 {item.publishedAt && fullDate(item.publishedAt)}{item.editedAt && ` · 수정됨 ${monthDay(item.editedAt)}`}</span>
                    <span className="manage-counts">
                      <span data-tip="조회수"><NavIcon name="eye" size={14} />{item.viewCount}<span className="sr-only">조회</span></span>
                      <span data-tip="좋아요"><NavIcon name="heart" size={14} />{item.likeCount}<span className="sr-only">좋아요</span></span>
                      <span data-tip="댓글"><NavIcon name="comment" size={14} />{item.commentCount}<span className="sr-only">댓글</span></span>
                    </span>
                  </>}
              </div>
            </div>
            <div className="manage-actions">
              {tab === 'trash' ? (
                <>
                  <button type="button" className="btn btn-outline btn-small" disabled={busy === item.id} onClick={() => restore(item)}>복구</button>
                  <button type="button" className="btn btn-text danger" disabled={busy === item.id} onClick={() => purge(item)}>영구 삭제</button>
                </>
              ) : item.status === 'DRAFT' ? (
                <>
                  <Link to={`/write/${item.id}`} className="btn btn-outline btn-small">이어 쓰기</Link>
                  <button type="button" className="btn btn-text danger" disabled={busy === item.id} onClick={() => remove(item)}>삭제</button>
                </>
              ) : (
                <>
                  <ViewLink id={item.id} onError={(text) => setNotice({ ok: false, text })} />
                  <Link to={`/write/${item.id}`} className="btn btn-outline btn-small">{item.editing ? '이어서 수정' : '수정'}</Link>
                  {item.editing && <button type="button" className="btn btn-text" onClick={() => discard(item)}>변경 취소</button>}
                  <select aria-label="공개 범위" data-tip="누가 볼 수 있는지 바꿔요" value={item.visibility ?? 'PUBLIC'}
                          onChange={(e) => changeVisibility(item, e.target.value as Visibility)}>
                    <option value="PUBLIC">공개</option>
                    <option value="FRIENDS">친구에게만</option>
                    <option value="PRIVATE">비공개</option>
                  </select>
                  <button type="button" className="btn btn-text danger" disabled={busy === item.id} onClick={() => remove(item)}>삭제</button>
                </>
              )}
            </div>
          </li>
        ))}
        {loading && items.length === 0 && [0, 1, 2].map((i) => <li key={`s${i}`} className="manage-item manage-skeleton" aria-hidden="true" />)}
      </ul>
      {!loading && loadError && items.length === 0 && (
        <p className="error" role="alert">목록을 불러오지 못했어요 <button type="button" className="btn btn-text" title="목록을 다시 불러와요" onClick={() => load(null)}>다시 시도</button></p>
      )}
      {!loading && !loadError && items.length === 0 && (
        <div className="empty">
          {tab === 'trash' ? <p>휴지통이 비어 있어요.</p> : tab === 'drafts' ? <p>임시글이 없어요.</p> : <p>발행한 글이 없어요.</p>}
          {tab !== 'trash' && <Link to="/write" className="btn btn-primary">새 글 쓰기</Link>}
        </div>
      )}
      {items.length > 0 && (
        <InfiniteLoader hasMore={cursor != null} loading={loading} failed={!loading && loadError} onMore={() => void load(cursor)} />
      )}
    </main>
  )
}

/** 상태 칩: 임시글·공개·친구에게만·나만 보기·휴지통을 색으로 나눠 한눈에 보이게 */
function StatusChip({ item, trash }: { item: ManageItem; trash: boolean }) {
  if (trash) return <span className="status-chip st-trash">휴지통</span>
  if (item.status === 'DRAFT') return <span className="status-chip st-draft">임시글</span>
  const v = item.visibility ?? 'PUBLIC'
  return <span className={`status-chip st-${v.toLowerCase()}`}>{VISIBILITY_ICON[v]} {VISIBILITY_LABEL[v]}</span>
}

function ViewLink({ id, onError }: { id: number; onError: (text: string) => void }) {
  // 글 주소는 서버가 /@handle/posts/{id}로 정한다. 상세 API에서 주소를 받아 이동한다
  return (
    <button type="button" className="btn btn-text" onClick={async () => {
      try {
        const p = await api<{ url: string }>(`/api/posts/${id}`)
        navigate(p.url)
      } catch (e) {
        onError(e instanceof ApiError ? e.message : '글을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.')
      }
    }}>보기</button>
  )
}

function isRecent(iso: string) {
  return Date.now() - new Date(iso).getTime() < 86_400_000
}
