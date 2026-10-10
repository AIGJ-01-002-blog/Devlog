import type { ReactNode } from 'react'
import { NavIcon } from './NavIcons'
import { loginPath, useAuth } from '../lib/auth'
import { Link } from '../lib/router'
import { t } from '../lib/i18n'

interface Item { to: string; label: string; tip: string; icon: ReactNode; active: (p: string) => boolean }

/**
 * 좁은 화면(640px 이하)의 아래 탭 (spec 055). 머리말에 다 들어가지 않던 검색·피드·태그·AI 연결을
 * 엄지가 닿는 자리로 옮기고, 터치에는 툴팁이 없으니 아이콘 아래에 이름을 늘 보인다. 넓은 화면에서는 CSS로 숨긴다.
 */
export function MobileNav({ path }: { path: string }) {
  const { me } = useAuth()
  const member = me?.member
  const items: Item[] = [
    { to: '/', label: t('홈'), tip: t('최신·트렌딩 글'), icon: <NavIcon name="home" size={22} />, active: (p) => p === '/' },
    member
      ? { to: '/feed', label: t('피드'), tip: t('팔로우한 사람의 새 글'), icon: <NavIcon name="feed" size={22} />, active: (p) => p === '/feed' }
      : { to: '/mcp', label: t('AI 연결'), tip: t('AI 도구에 devlog 연결하기'), icon: <NavIcon name="ai" size={22} />, active: (p) => p === '/mcp' },
    { to: '/search', label: t('검색'), tip: t('글·사람 검색'), icon: <NavIcon name="search" size={22} />, active: (p) => p === '/search' },
    { to: '/tags', label: t('태그'), tip: t('태그별로 글 모아 보기'), icon: <NavIcon name="tag" size={22} />, active: (p) => p === '/tags' || p.startsWith('/tags/') },
    member
      ? { to: `/@${member.handle}`, label: t('내 블로그'), tip: t('내 블로그로 가기'), icon: <NavIcon name="me" size={22} />, active: (p) => p === `/@${member.handle}` || p.startsWith(`/@${member.handle}/`) }
      : { to: loginPath(), label: t('로그인'), tip: t('로그인하고 글쓰기·좋아요·팔로우'), icon: <NavIcon name="me" size={22} />, active: (p) => p === '/login' },
  ]
  return (
    <nav className="mobile-nav" aria-label={t('주요 메뉴')}>
      {items.map((it) => {
        const on = it.active(path)
        return (
          <Link key={it.label} to={it.to} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined} data-tip={it.tip}>
            {it.icon}<span>{it.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
