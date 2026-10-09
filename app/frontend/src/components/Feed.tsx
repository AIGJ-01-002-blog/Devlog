import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { Card, FeedPage } from '../lib/types'
import { InfiniteLoader } from './InfiniteLoader'
import { PostCard } from './PostCard'

const KEEP_MS = 30 * 60 * 1000

interface Saved {
  items: Card[]
  nextCursor: string | null
  scrollY: number
  at: number
}

/**
 * 카드 목록 + 무한 스크롤(spec 069). 이어 붙일 때 이미 있는 글은 건너뛴다(docs/10 §4-3).
 * 상세에서 뒤로 오면 카드·커서·스크롤 위치를 30분 동안 복원한다(L-6).
 */
export function Feed({ endpoint, storageKey, initial, showAuthor = true, empty, onFirstPage }: {
  endpoint: string
  /** 첫 쪽을 서버에서 새로 받았을 때 (태그 페이지의 글 수 같은 머리 정보) */
  onFirstPage?: (page: FeedPage) => void
  storageKey: string
  initial: FeedPage | null
  showAuthor?: boolean
  empty: React.ReactNode
}) {
  const restored = useRef<Saved | null>(readSaved(storageKey))
  const [items, setItems] = useState<Card[]>(restored.current?.items ?? initial?.items ?? [])
  const [cursor, setCursor] = useState<string | null>(restored.current ? restored.current.nextCursor : initial?.nextCursor ?? null)
  const [loaded, setLoaded] = useState(restored.current != null || initial != null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const state = useRef({ items, cursor })
  const firstPage = useRef(onFirstPage)
  firstPage.current = onFirstPage
  state.current = { items, cursor }

  const load = useCallback(async (next: string | null) => {
    setLoading(true)
    setError(false)
    if (next) setNotice(null)
    try {
      const page = await api<FeedPage>(next ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(next)}` : endpoint)
      if (!next) firstPage.current?.(page)
      setItems((prev) => {
        const base = next ? prev : []
        const seen = new Set(base.map((c) => c.id))
        return [...base, ...page.items.filter((c) => !seen.has(c.id))]
      })
      setCursor(page.nextCursor)
      setLoaded(true)
    } catch (e) {
      // 보던 순위표가 만료됨 (017 트렌딩): 안내 뒤 최신 순위를 처음부터 다시 받는다
      if (next && e instanceof ApiError && e.status === 410) {
        setNotice(e.message || '순위가 새로 바뀌었어요.')
        window.scrollTo(0, 0)
        // 첫 쪽을 다시 받을 때까지 기다린다: 먼저 끝난 것으로 보이면 무한 스크롤이 만료된 커서로 또 부른다
        await load(null)
        return
      }
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    if (!loaded) void load(null)
  }, [loaded, load])

  useLayoutEffect(() => {
    if (restored.current) window.scrollTo(0, restored.current.scrollY)
    restored.current = null
    return () => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ ...state.current, nextCursor: state.current.cursor,
          scrollY: window.scrollY, at: Date.now() }))
      } catch {
        // 저장 공간이 없으면 복원하지 않는다
      }
    }
  }, [storageKey])

  if (loaded && items.length === 0 && !error) return <div className="empty">{empty}</div>
  return (
    <section>
      {notice && <p className="feed-notice" role="status">{notice}</p>}
      <div className="card-grid">
        {items.map((c) => <PostCard key={c.id} card={c} showAuthor={showAuthor} />)}
      </div>
      <InfiniteLoader hasMore={cursor != null} loading={loading} failed={error} onMore={() => void load(cursor)}
        failedText="글을 불러오지 못했어요" />
      {!loaded && loading && <p className="muted center">불러오는 중…</p>}
    </section>
  )
}

function readSaved(key: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const s = JSON.parse(raw) as Saved
    if (Date.now() - s.at > KEEP_MS || navigationType() !== 'back_forward') return null
    return s
  } catch {
    return null
  }
}

let firstNavigation = true
function navigationType(): string {
  // 앱 안에서 뒤로 가기(popstate)는 back_forward로 본다
  if (firstNavigation) {
    firstNavigation = false
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    return nav?.type ?? 'navigate'
  }
  return lastPop ? 'back_forward' : 'navigate'
}
let lastPop = false
window.addEventListener('popstate', () => {
  lastPop = true
  setTimeout(() => (lastPop = false), 1000)
})
