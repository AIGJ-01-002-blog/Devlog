import { useEffect, useRef, useState } from 'react'
import { loginPath, useAuth } from '../lib/auth'
import { Link, navigate, useLocation } from '../lib/router'
import { Avatar } from './Avatar'
import { NavIcon, type IconName } from './NavIcons'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'

interface NavItem { to: string; label: string; tip: string; icon: IconName; on: (p: string) => boolean; memberOnly?: boolean }

/**
 * 머리말 메뉴 (062). 순서는 "피드 · 좋아한 글 · 태그 · 문의·신고 · 릴리스 노트 · 🔔"(민서님 요청).
 * 넓은 화면은 아이콘과 이름을, 중간 화면(641~1180px)은 아이콘만 보이고 툴팁으로 이름을 알린다.
 * 휴대폰(640px 이하)은 아래 탭과 내 메뉴가 같은 곳으로 데려간다.
 */
export function headerItems(path: string): NavItem[] {
  return [
    { to: '/feed', label: '피드', tip: '팔로우한 사람의 새 글', icon: 'feed', on: (p) => p === '/feed', memberOnly: true },
    { to: '/lists/liked', label: '좋아한 글', tip: '내가 좋아요를 누른 글', icon: 'heart', on: (p) => p === '/lists/liked', memberOnly: true },
    { to: '/tags', label: '태그', tip: '태그별로 글 모아 보기', icon: 'tag', on: (p) => p === '/tags' || p.startsWith('/tags/') },
    // 지금 화면 주소를 함께 넘겨 버그가 난 곳을 남긴다 (054)
    { to: path.startsWith('/support') ? '/support' : `/support?from=${encodeURIComponent(path)}`, label: '문의·신고',
      tip: '궁금한 점·버그·제안을 운영자에게 보내요', icon: 'support', on: (p) => p === '/support' },
    { to: '/releases', label: '릴리스 노트', tip: '버전마다 바뀐 점을 봐요', icon: 'releases', on: (p) => p === '/releases' },
  ]
}

export function Header() {
  const { me, logout } = useAuth()
  const { path } = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const member = me?.member
  const items = headerItems(path).filter((it) => member || !it.memberOnly)
  // 휴대폰에서는 머리말 메뉴가 숨으니 아래 탭에 없는 것(좋아한 글·문의·신고·릴리스 노트)을 내 메뉴 아래에 둔다
  const mobileExtra = items.filter((it) => it.icon !== 'feed' && it.icon !== 'tag')
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo" data-tip="첫 화면으로"><span className="logo-mark" aria-hidden="true" />devlog</Link>
        <nav className="header-actions" aria-label="머리말 메뉴">
          <Link to="/search" className="btn btn-text header-search header-nav" aria-label="검색" data-tip="글·사람 검색">
            <NavIcon name="search" />
          </Link>
          <Link to="/mcp" className="btn btn-text header-mcp" data-tip="Claude·ChatGPT 같은 AI 도구에 devlog 연결하기">AI 연결</Link>
          <span className="header-sep header-nav" aria-hidden="true" />
          {items.map((it) => {
            const on = it.on(path)
            return (
              <Link key={it.icon} to={it.to} className={`btn btn-text header-nav header-link${on ? ' on' : ''}`}
                    aria-current={on ? 'page' : undefined} aria-label={it.label} data-tip={it.tip}>
                <NavIcon name={it.icon} /><span className="header-label">{it.label}</span>
              </Link>
            )
          })}
          {member ? (
            <>
              <NotificationBell />
              <Link to="/write" className="btn btn-outline header-write" aria-label="새 글 작성" data-tip="새 글 쓰기"><span className="long">새 글 작성</span><span className="short" aria-hidden="true">글쓰기</span><span className="icon" aria-hidden="true">✏️</span></Link>
              <div className="menu" ref={menuRef}>
                <button type="button" className="menu-button" aria-haspopup="menu" aria-expanded={open} data-tip="내 메뉴: 내 설정·내 블로그·글 관리·로그아웃"
                        onClick={() => setOpen((o) => !o)}>
                  <Avatar src={member.profileImageUrl} name={member.nickname} seed={member.handle} />
                  <span className="sr-only">내 메뉴</span>
                </button>
                {open && (
                  <div className="menu-list profile-menu" role="menu" onClick={() => setOpen(false)}>
                    <div className="menu-who">
                      <Avatar src={member.profileImageUrl} name={member.nickname} seed={member.handle} size={40} />
                      <span><b>{member.nickname}</b><span className="muted">@{member.handle}</span></span>
                    </div>
                    <Link to="/settings" role="menuitem"><NavIcon name="settings" />내 설정</Link>
                    <Link to={`/@${member.handle}`} role="menuitem"><NavIcon name="blog" />내 블로그</Link>
                    <Link to="/manage/posts" role="menuitem"><NavIcon name="posts" />내 글 관리</Link>
                    <div className="menu-mobile-only">
                      <div className="menu-sep" role="separator" />
                      {mobileExtra.map((it) => <Link key={it.icon} to={it.to} role="menuitem"><NavIcon name={it.icon} />{it.label}</Link>)}
                    </div>
                    {member.role === 'ADMIN' && (
                      <>
                        <div className="menu-sep" role="separator" />
                        <Link to="/admin/reports" role="menuitem"><NavIcon name="shield" />신고 관리</Link>
                        <Link to="/admin/inquiries" role="menuitem"><NavIcon name="inbox" />문의 관리</Link>
                      </>
                    )}
                    <div className="menu-sep" role="separator" />
                    <button type="button" role="menuitem" onClick={async () => {
                      await logout()
                      navigate('/')
                    }}><NavIcon name="logout" />로그아웃</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to={loginPath()} className="btn btn-dark" data-tip="로그인하고 글쓰기·좋아요·팔로우">로그인</Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
