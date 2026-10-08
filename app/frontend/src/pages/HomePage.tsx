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
  const { me, loading } = useAuth()
  useEffect(() => { document.title = trending ? '트렌딩 - devlog' : 'devlog' }, [trending])
  return (
    <main className="container">
      <h1 className="sr-only">{trending ? '트렌딩' : '최신 글'}</h1>
      {!loading && !me?.authenticated && <HomeHero />}
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

/** 비회원 첫 화면 소개 (048). 로그인한 사람에게는 바로 글 목록을 보인다. 제목 구조를 흐트리지 않게 소제목 태그는 쓰지 않는다. */
function HomeHero() {
  return (
    <section className="home-hero" aria-label="devlog 소개">
      <p className="home-hero-eyebrow"><span className="home-hero-dot" aria-hidden="true" />개발자의 기록 공간</p>
      <p className="home-hero-title">쓰는 순간부터<br />읽히는 순간까지</p>
      <p className="home-hero-sub">자동 저장되는 에디터, AI 태그 추천, 시리즈와 목차까지. 배운 것을 기록하고 함께 읽어요.</p>
      <div className="home-hero-actions">
        <Link to={loginPath('/write')} className="btn btn-primary btn-lg">글쓰기 시작하기</Link>
        <Link to="/tags" className="btn btn-outline btn-lg">태그 둘러보기</Link>
      </div>
    </section>
  )
}
