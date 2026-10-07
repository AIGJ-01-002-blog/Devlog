import { useEffect, useState } from 'react'
import { Feed } from '../components/Feed'
import { takeInitialData } from '../lib/api'
import { loginPath, useAuth } from '../lib/auth'
import { Link, useLocation } from '../lib/router'
import { TRENDING_ENDPOINT, TRENDING_HINT } from '../lib/trending'
import type { FeedPage } from '../lib/types'

/** 홈 (003, 017): [최신] [트렌딩] 탭. 기본은 최신, 트렌딩은 `/?tab=trending`. 순위 숫자는 보이지 않는다. */
export function HomePage() {
  const { search } = useLocation()
  const trending = search.get('tab') === 'trending'
  const [boot] = useState(() => takeInitialData<{ feed?: FeedPage; trending?: FeedPage }>('home'))
  const { me } = useAuth()
  useEffect(() => { document.title = trending ? '트렌딩 - devlog' : 'devlog' }, [trending])
  return (
    <main className="container">
      <h1 className="sr-only">{trending ? '트렌딩' : '최신 글'}</h1>
      <nav className="tabs home-tabs" aria-label="글 목록">
        <Link to="/" aria-current={trending ? undefined : 'page'}>최신</Link>
        <Link to="/?tab=trending" aria-current={trending ? 'page' : undefined}>트렌딩</Link>
      </nav>
      {trending ? (
        <>
          <p className="muted small trending-hint">{TRENDING_HINT}</p>
          <Feed key="trending" endpoint={TRENDING_ENDPOINT} storageKey="feed:trending" initial={boot?.trending ?? null} empty={
            <>
              <p>아직 트렌딩 글이 없어요</p>
              <Link to="/" className="btn btn-primary">최신 글 보기</Link>
            </>
          } />
        </>
      ) : (
        <Feed key="latest" endpoint="/api/posts" storageKey="feed:home" initial={boot?.feed ?? null} empty={
          <>
            <p>아직 올라온 글이 없어요. 첫 글의 주인공이 되어 보세요.</p>
            {me?.authenticated ? <Link to="/write" className="btn btn-primary">글쓰기</Link>
              : <Link to={loginPath('/write')} className="btn btn-primary">로그인</Link>}
          </>
        } />
      )}
    </main>
  )
}
