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

/**
 * 비회원 첫 화면 소개 (048, 051). 슬로건과 "AI에 devlog 연결하기", 그리고 AI가 개발 일지를 쓰는 모습을 보여 준다.
 * 로그인한 사람에게는 바로 글 목록을 보인다. 제목 구조를 흐트리지 않게 소제목 태그는 쓰지 않는다.
 */
function HomeHero() {
  return (
    <section className="home-hero" aria-label="devlog 소개">
      <div className="home-hero-copy">
        <p className="home-hero-eyebrow"><span className="home-hero-dot" aria-hidden="true" />MCP 개발 일지 · Claude · Cursor</p>
        <p className="home-hero-title">코딩은 AI와,<br /><span className="home-hero-accent">기록은 devlog가.</span></p>
        <p className="home-hero-sub">내 AI 도구에 devlog를 연결하면, 오늘 작업한 대화와 커밋을 정리해 개발 일지 초안을 써 줘요. 나는 확인하고 [발행]만 누르면 돼요.</p>
        <div className="home-hero-actions">
          <Link to="/mcp" className="btn btn-primary btn-lg">AI에 devlog 연결하기</Link>
          <Link to={loginPath('/write')} className="btn btn-outline btn-lg">직접 글쓰기</Link>
        </div>
      </div>
      <HeroDemo />
    </section>
  )
}

/** AI 도구 안에서 개발 일지를 부탁하는 장면. 장식이라 화면 읽기 프로그램에는 한 줄 설명만 읽힌다. */
function HeroDemo() {
  return (
    <figure className="hero-demo">
      <figcaption className="sr-only">예시: AI에게 "오늘 개발 일지 써 줘"라고 하면 devlog에 임시글이 생긴다</figcaption>
      <div className="hero-demo-bar" aria-hidden="true"><span /><span /><span /><b>Claude Code</b></div>
      <div className="hero-demo-body" aria-hidden="true">
        <p className="hero-demo-me"><span>›</span> 오늘 한 작업으로 개발 일지 써 줘</p>
        <p className="hero-demo-tool"><span className="hero-demo-ok">●</span> devlog · <code>write_devlog</code></p>
        <div className="hero-demo-card">
          <span className="hero-demo-label">임시글</span>
          <b>Gemini 한도 넘으면 Ollama로 넘기기</b>
          <span className="hero-demo-meta">커밋 4개 · 대화 요약 · 태그 spring-ai, ollama</span>
        </div>
        <p className="hero-demo-ai">devlog에 임시글을 만들었어요. 읽어 보고 발행해 주세요.</p>
      </div>
    </figure>
  )
}
