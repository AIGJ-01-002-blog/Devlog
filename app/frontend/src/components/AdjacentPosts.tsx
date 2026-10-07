import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link } from '../lib/router'
import type { SeriesItem } from '../lib/series'

/** 서버가 보는 사람의 블로그 목록 순서로 정한 이웃 글 (spec 040). prev가 더 오래된 글. */
export interface Adjacent {
  prev: SeriesItem | null
  next: SeriesItem | null
}

/** 글 상세 아래 이전·다음 글 (velog의 이전/다음 포스트). 본문 아래라 늦게 읽고, 실패하면 아무것도 그리지 않는다. */
export function AdjacentPosts({ postId }: { postId: number }) {
  const [adj, setAdj] = useState<Adjacent | null>(null)

  useEffect(() => {
    let alive = true
    api<Adjacent>(`/api/posts/${postId}/adjacent`).then((a) => { if (alive) setAdj(a) }).catch(() => {})
    return () => { alive = false }
  }, [postId])

  if (!adj || (!adj.prev && !adj.next)) return null
  return (
    <nav className="adjacent-posts" aria-label="이전 글과 다음 글">
      {adj.prev && (
        <Link to={adj.prev.url} className="adjacent prev" rel="prev">
          <span className="muted small">← 이전 글</span>
          <b>{adj.prev.title}</b>
        </Link>
      )}
      {adj.next && (
        <Link to={adj.next.url} className="adjacent next" rel="next">
          <span className="muted small">다음 글 →</span>
          <b>{adj.next.title}</b>
        </Link>
      )}
    </nav>
  )
}
