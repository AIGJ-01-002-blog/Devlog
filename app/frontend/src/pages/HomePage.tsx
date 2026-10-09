import { useEffect, useState } from 'react'
import { BranchList, BranchMark } from '../components/BranchList'
import { Feed } from '../components/Feed'
import { api, takeInitialData } from '../lib/api'
import { loginPath, useAuth } from '../lib/auth'
import { Link, useLocation } from '../lib/router'
import { TRENDING_ENDPOINT, TRENDING_HINT } from '../lib/trending'
import { tagPath } from '../lib/tags'
import type { Branch, Card, FeedPage } from '../lib/types'

/**
 * 홈 (003, 017, 072): [최신] [트렌딩] 탭. 기본은 최신, 트렌딩은 `/?tab=trending`. 순위 숫자는 보이지 않는다.
 * 최신은 브랜치 그래프 목록이고 `/?branch=s12`처럼 한 브랜치 글만 걸러 볼 수 있다. 넓은 화면에는 옆 칸이 있다.
 */
export function HomePage() {
  const { search } = useLocation()
  const trending = search.get('tab') === 'trending'
  const branch = trending ? null : search.get('branch')
  const [boot] = useState(() => takeInitialData<{ feed?: FeedPage; trending?: FeedPage }>('home'))
  const { me, loading } = useAuth()
  useEffect(() => { document.title = trending ? '트렌딩 - devlog' : 'devlog' }, [trending])
  return (
    <main className="container home-layout">
      <div className="home-main">
        {!loading && !me?.authenticated && <HomeHero />}
        <div className="home-head">
          <h1 className="page-title">{trending ? '트렌딩' : '개발 기록'}</h1>
          <p className="muted small">{trending ? TRENDING_HINT : '새 글은 main에 쌓이고, 이어지는 글은 시리즈·주제 브랜치로 갈라져요.'}</p>
        </div>
        <nav className="tabs home-tabs" aria-label="글 목록">
          <Link to="/" aria-current={trending ? undefined : 'page'}>최신</Link>
          <Link to="/?tab=trending" aria-current={trending ? 'page' : undefined}>트렌딩</Link>
        </nav>
        {trending ? (
          <Feed key="trending" endpoint={TRENDING_ENDPOINT} storageKey="feed:trending" initial={boot?.trending ?? null}
            renderItems={(items, hasMore) => <BranchList items={items} hasMore={hasMore} graph={false} />} empty={
            <>
              <p>아직 트렌딩 글이 없어요</p>
              <Link to="/" className="btn btn-primary">최신 글 보기</Link>
            </>
          } />
        ) : (
          // 서버가 처음 넣어 준 목록은 거르지 않은 목록이라, 브랜치로 거를 때는 쓰지 않는다
          <Feed key={branch ?? 'latest'} endpoint={branch ? `/api/posts?branch=${encodeURIComponent(branch)}` : '/api/posts'}
            storageKey={branch ? `feed:home:${branch}` : 'feed:home'} initial={branch ? null : boot?.feed ?? null}
            renderItems={(items, hasMore) => (
              <>
                <BranchChips items={items} active={branch} />
                <BranchList items={items} hasMore={hasMore} />
              </>
            )}
            empty={branch ? (
              <>
                <p>이 브랜치에 보이는 글이 없어요</p>
                <Link to="/" className="btn btn-primary">모든 글 보기</Link>
              </>
            ) : (
              <>
                <p>아직 올라온 글이 없어요. 첫 글의 주인공이 되어 보세요.</p>
                {me?.authenticated ? <Link to="/write" className="btn btn-primary">글쓰기</Link>
                  : <Link to={loginPath('/write')} className="btn btn-primary">로그인</Link>}
              </>
            )} />
        )}
      </div>
      <HomeAside />
    </main>
  )
}

/** 최신 목록 위 브랜치 버튼 (072). 지금 보이는 글의 브랜치를 위에서부터 5개까지 */
function BranchChips({ items, active }: { items: Card[]; active: string | null }) {
  const seen = new Map<string, Branch>()
  for (const c of items) {
    if (c.branch && c.branch.total > 1 && !seen.has(c.branch.key)) seen.set(c.branch.key, c.branch)
  }
  let chips = [...seen.values()].slice(0, BRANCH_CHIPS)
  if (active && !chips.some((b) => b.key === active)) {
    const cur = seen.get(active)
    if (cur) chips = [cur, ...chips.slice(0, BRANCH_CHIPS - 1)]
  }
  if (chips.length === 0 && !active) return null
  return (
    <nav className="branch-chips" aria-label="브랜치로 걸러 보기">
      <Link to="/" className="branch-chip" aria-current={active ? undefined : 'page'} data-tip="모든 글을 시간순으로 봐요">모든 글</Link>
      {chips.map((b) => (
        <Link key={b.key} to={`/?branch=${b.key}`} className={`branch-chip branch-chip-${b.kind.toLowerCase()}`}
              aria-current={active === b.key ? 'page' : undefined}
              data-tip={branchTip(b)}>
          <BranchMark kind={b.kind} />{b.name}
        </Link>
      ))}
    </nav>
  )
}

const BRANCH_CHIPS = 5

/** 브랜치 버튼 설명. 주제 브랜치는 글쓴이가 만든 시리즈가 아니라 자동으로 묶인 것임을 알린다 */
function branchTip(b: Branch): string {
  return b.kind === 'SERIES'
    ? `시리즈: 글쓴이가 엮은 ${b.name} ${b.total}편만 봐요`
    : `주제 브랜치: 태그·내용이 비슷해 자동으로 묶인 글 ${b.total}편만 봐요`
}

interface PopularTopic { key: string; name: string; postCount: number; url: string }
interface PopularTag { name: string; postCount: number }

/** 홈 옆 칸 (072): 이어지는 주제, 많이 쓰는 태그, AI 연결, 릴리스 노트·문의. 좁은 화면에서는 숨긴다(무한 스크롤 끝에 닿지 않는다) */
function HomeAside() {
  const [topics, setTopics] = useState<PopularTopic[]>([])
  const [tags, setTags] = useState<PopularTag[]>([])
  useEffect(() => {
    // 곁들이 정보라 실패하면 그 칸만 비운다
    api<PopularTopic[]>('/api/topics/popular').then(setTopics, () => setTopics([]))
    api<PopularTag[]>('/api/tags?limit=8').then(setTags, () => setTags([]))
  }, [])
  return (
    <aside className="home-aside" aria-label="둘러보기">
      {topics.length > 0 && (
        <section className="aside-box">
          <h2 className="aside-title">이어지는 주제</h2>
          <ul className="aside-topics">
            {topics.map((t) => (
              <li key={t.key}>
                <Link to={t.url} data-tip={`주제 브랜치: 태그·내용이 비슷해 자동으로 묶인 글 ${t.postCount}편이에요`}>
                  <BranchMark kind="TOPIC" /><span>{t.name}</span><span className="muted small">{t.postCount}편</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tags.length > 0 && (
        <section className="aside-box">
          <h2 className="aside-title">많이 쓰는 태그</h2>
          <ul className="card-tags">
            {tags.map((t) => <li key={t.name}><Link to={tagPath(t.name)} className="card-tag" data-tip={`글 ${t.postCount}편`}>#{t.name}</Link></li>)}
          </ul>
        </section>
      )}
      <section className="aside-box aside-ai">
        <h2 className="aside-title">AI가 쓰는 개발 일지</h2>
        <p className="muted small">Claude·Cursor에 devlog를 연결하면 오늘 한 작업을 임시글로 정리해 줘요.</p>
        <Link to="/mcp" className="btn btn-outline btn-small">AI에 연결하기</Link>
      </section>
      <nav className="aside-links" aria-label="도움말">
        <Link to="/releases">릴리스 노트</Link>
        <span aria-hidden="true">·</span>
        <Link to="/support">문의·신고</Link>
      </nav>
    </aside>
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
