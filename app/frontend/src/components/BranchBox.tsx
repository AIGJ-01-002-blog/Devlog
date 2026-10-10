import { useMemo } from 'react'
import { branchNeighbors, readPosts, type BranchNav } from '../lib/branch'
import { Link } from '../lib/router'
import { BranchMark } from './BranchList'
import { t } from '../lib/i18n'

/**
 * 글 화면 브랜치 상자 (072 2단계). 이 글이 이어지는 시리즈·주제 브랜치의 글을 그래프 모양으로 보인다:
 * 맨 아래가 main에서 갈라진 첫 글이고 위로 갈수록 최근 글이다. 지금 글은 강조하고, 이 기기에서 읽은 글에는 체크를 단다.
 */
export function BranchBox({ nav, postId }: { nav: BranchNav; postId: number }) {
  const read = useMemo(() => readPosts(), [postId])
  const { prev, next } = branchNeighbors(nav)
  const kind = nav.kind.toLowerCase()
  const rows = [...nav.posts].reverse()
  return (
    <nav className={`branch-box branch-box-${kind}`} aria-label={nav.kind === 'SERIES' ? t('시리즈') : t('이어지는 주제')}>
      <header className="branch-box-head">
        <Link to={nav.url} className={`bl-branch bl-branch-${kind}`}
              data-tip={nav.kind === 'SERIES' ? t('시리즈 글 모두 보기') : t('홈에서 자동으로 묶인 비슷한 글만 보기')}>
          <BranchMark kind={nav.kind} />{nav.name} {nav.kind === 'SERIES' ? t('시리즈') : t('브랜치')}
        </Link>
        <span className="muted small">{nav.index != null ? t('{0}편 중 {1}편', { 0: nav.posts.length, 1: nav.index }) : t('글 {0}편', { 0: nav.posts.length })}</span>
      </header>
      <ol className="branch-box-list" reversed>
        {rows.map((p) => {
          const here = p.id === postId
          return (
            <li key={p.id} className={here ? 'is-here' : undefined} aria-current={here ? 'page' : undefined}>
              <span className="branch-box-dot" aria-hidden="true" />
              {here ? <b>{p.title}</b> : <Link to={p.url}>{p.title}</Link>}
              {!here && read.has(p.id) && <span className="branch-box-read" data-tip={t('이 기기에서 읽은 글')} tabIndex={0}>
                <span aria-hidden="true">✓</span><span className="sr-only">{t('읽음')}</span></span>}
            </li>
          )
        })}
        <li className="branch-box-fork" aria-hidden="true"><span className="branch-box-dot" />{t('main에서 갈라짐')}</li>
      </ol>
      <footer className="branch-box-foot">
        {prev ? <Link to={prev.url} className="btn btn-outline btn-small" data-tip={prev.title}>{t('‹ 이전 글')}</Link> : <span />}
        {next ? <Link to={next.url} className="btn btn-primary btn-small" data-tip={next.title}>{t('다음 글 ›')}</Link> : null}
      </footer>
    </nav>
  )
}
