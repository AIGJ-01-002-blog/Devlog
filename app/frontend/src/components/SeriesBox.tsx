import { useEffect, useState } from 'react'
import { Link } from '../lib/router'
import { neighbors, seriesApi, seriesPath, type SeriesNav } from '../lib/series'

/** 글 상세 위의 시리즈 상자 (024 US2-1): 이름, 현재 순서/전체, 펼치는 목록, 이전·다음 글. */
export function SeriesBox({ postId }: { postId: number }) {
  const [nav, setNav] = useState<SeriesNav | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    seriesApi.ofPost(postId).then((n) => { if (alive) setNav(n) }).catch(() => {})
    return () => { alive = false }
  }, [postId])

  if (!nav || nav.posts.length === 0) return null
  const { prev, next } = neighbors(nav)
  return (
    <nav className="series-box" aria-label="시리즈">
      <h2><Link to={seriesPath(nav.handle, nav.slug)}>{nav.name}</Link></h2>
      {open && (
        <ol className="series-list">
          {nav.posts.map((p) => (
            <li key={p.id} aria-current={p.id === postId ? 'page' : undefined}>
              {p.id === postId ? <b>{p.title}</b> : <Link to={p.url}>{p.title}</Link>}
            </li>
          ))}
        </ol>
      )}
      <div className="series-foot row">
        <button type="button" className="btn btn-text" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? '▲ 숨기기' : '▼ 목록 보기'}
        </button>
        <span className="muted small">{nav.index != null ? `${nav.index}/${nav.posts.length}` : `글 ${nav.posts.length}개`}</span>
        <span className="series-arrows">
          {prev ? <Link to={prev.url} className="btn btn-outline" aria-label={`이전 글: ${prev.title}`}>‹</Link>
            : <span className="btn btn-outline" aria-disabled="true">‹</span>}
          {next ? <Link to={next.url} className="btn btn-outline" aria-label={`다음 글: ${next.title}`}>›</Link>
            : <span className="btn btn-outline" aria-disabled="true">›</span>}
        </span>
      </div>
    </nav>
  )
}
