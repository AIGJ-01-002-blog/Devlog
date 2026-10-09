import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { BranchMark } from '../components/BranchList'
import { GraphLogo } from '../components/GraphLogo'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { compactNumber, fullDate, monthDay } from '../lib/format'
import { contactHref, portfolioApi, type Portfolio, type Project } from '../lib/portfolio'
import { Link } from '../lib/router'
import { SOCIAL_FIELDS } from '../lib/socialLinks'
import { NotFoundPage } from './NotFoundPage'

/**
 * 포트폴리오 모드 /@handle/portfolio (072 3단계). 그래프 로고와 "○○의 개발 기록", 머리(이름·한 줄 소개·GitHub·연락하기·수),
 * 그리고 프로젝트(포트폴리오에 보이기로 한 시리즈)마다 설명과 그 시리즈 글을 브랜치 모양으로 보인다.
 */
export function PortfolioPage({ handle }: { handle: string }) {
  const [data, setData] = useState<Portfolio | null>(null)
  const [missing, setMissing] = useState(false)
  const [failed, setFailed] = useState(false)
  const { me } = useAuth()

  useEffect(() => {
    let alive = true
    portfolioApi.of(handle)
      .then((p) => { if (alive) { setData(p); document.title = `${p.nickname}의 개발 기록 - 포트폴리오` } })
      .catch((e) => { if (alive) (e instanceof ApiError && e.status === 404 ? setMissing : setFailed)(true) })
    return () => { alive = false }
  }, [handle])

  if (missing) return <NotFoundPage />
  if (failed) return <main className="container narrow"><p className="muted center" role="alert">포트폴리오를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p></main>
  if (!data) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

  const mine = me?.member?.handle === data.handle
  const github = SOCIAL_FIELDS.find((f) => f.kind === 'github')!
  const contact = contactHref(data.socialLinks)
  return (
    <main className="container portfolio">
      <div className="portfolio-brand">
        <GraphLogo />
        <span>{data.nickname}의 개발 기록</span>
        <Link to={`/@${data.handle}`} className="btn btn-text btn-small portfolio-back" data-tip="블로그 글 목록으로 가요">블로그로 보기</Link>
      </div>
      <header className="portfolio-hero">
        <Avatar src={data.profileImageUrl} name={data.nickname} seed={data.handle} size={88} />
        <div className="portfolio-hero-text">
          <h1 className="page-title">{data.nickname}</h1>
          {data.bio && <p className="portfolio-role">{data.bio}</p>}
          <div className="row portfolio-actions">
            {data.socialLinks.github && (
              <a href={github.href(data.socialLinks.github)} className="btn btn-primary" target="_blank" rel="noopener me"
                 data-tip="새 탭에서 GitHub 열기">GitHub 보기</a>
            )}
            {contact && <a href={contact} className="btn btn-outline" target={contact.startsWith('mailto:') ? undefined : '_blank'}
                           rel="noopener" data-tip="이메일이나 홈페이지로 연락해요">연락하기</a>}
          </div>
        </div>
        <ul className="portfolio-stats">
          <li><b>{compactNumber(data.postCount)}</b><span>쓴 글</span></li>
          <li><b>{compactNumber(data.projects.length)}</b><span>프로젝트</span></li>
          <li><b>{compactNumber(data.likeCount)}</b><span>받은 좋아요</span></li>
        </ul>
      </header>

      <h2 className="portfolio-section">프로젝트</h2>
      {data.projects.length === 0 ? (
        <div className="empty">
          <p>아직 포트폴리오에 보이는 프로젝트가 없어요.</p>
          {mine && <p className="muted small">시리즈 화면의 [포트폴리오 프로젝트]에서 시리즈를 프로젝트로 보이게 할 수 있어요.</p>}
          {mine && <Link to={`/@${data.handle}/series`} className="btn btn-primary">내 시리즈 보기</Link>}
        </div>
      ) : (
        <div className="portfolio-projects">
          {data.projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </main>
  )
}

function ProjectCard({ project: p }: { project: Project }) {
  const first = p.posts[0]?.firstPublicAt
  return (
    <article className="project-card">
      <div className="project-main">
        <header>
          <h3 className="project-title"><Link to={p.url}>{p.name}</Link></h3>
          {p.period && <p className="muted small">{p.period}</p>}
        </header>
        {p.summary && <p className="project-summary">{p.summary}</p>}
        {p.tech.length > 0 && (
          <ul className="card-tags project-tech" aria-label="쓴 기술">
            {p.tech.map((t) => <li key={t}><span className="card-tag">{t}</span></li>)}
          </ul>
        )}
        {p.teamWork && <section className="project-text"><h4>우리 팀이 한 일</h4><p>{p.teamWork}</p></section>}
        {p.myRole && <section className="project-text"><h4>제 역할</h4><p>{p.myRole}</p></section>}
      </div>
      <nav className="branch-box branch-box-series project-branch" aria-label={`${p.name} 글`}>
        <header className="branch-box-head">
          <Link to={p.url} className="bl-branch bl-branch-series" data-tip="시리즈 글 모두 보기"><BranchMark kind="SERIES" />글 {p.posts.length}편</Link>
          {first && <span className="muted small" title={fullDate(first)}>{monthDay(first)} 시작</span>}
        </header>
        {p.posts.length === 0 ? <p className="muted small">아직 공개한 글이 없어요.</p> : (
          <ol className="branch-box-list" reversed>
            {[...p.posts].reverse().map((post) => (
              <li key={post.id}><span className="branch-box-dot" aria-hidden="true" /><Link to={post.url}>{post.title}</Link></li>
            ))}
            <li className="branch-box-fork" aria-hidden="true"><span className="branch-box-dot" />main에서 갈라짐</li>
          </ol>
        )}
      </nav>
    </article>
  )
}
