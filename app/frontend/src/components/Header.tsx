import { useEffect, useRef, useState } from 'react'
import { loginPath, useAuth } from '../lib/auth'
import { Link, navigate } from '../lib/router'
import { Avatar } from './Avatar'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const { me, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const member = me?.member
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo">devlog</Link>
        <nav className="header-actions">
          <Link to="/search" className="btn btn-text header-search" aria-label="검색">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2"
                 strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
          {member && <Link to="/feed" className="btn btn-text">피드</Link>}
          <Link to="/tags" className="btn btn-text">태그</Link>
          {member ? (
            <>
              <NotificationBell />
              <Link to="/write" className="btn btn-outline header-write" aria-label="새 글 작성"><span className="long">새 글 작성</span><span className="short" aria-hidden="true">글쓰기</span></Link>
              <div className="menu" ref={menuRef}>
                <button type="button" className="menu-button" aria-haspopup="menu" aria-expanded={open}
                        onClick={() => setOpen((o) => !o)}>
                  <Avatar src={member.profileImageUrl} name={member.nickname} seed={member.handle} />
                  <span className="sr-only">내 메뉴</span>
                </button>
                {open && (
                  <div className="menu-list" role="menu" onClick={() => setOpen(false)}>
                    <div className="menu-who">{member.nickname} <span className="muted">@{member.handle}</span></div>
                    <Link to={`/@${member.handle}`} role="menuitem">내 블로그</Link>
                    <Link to="/manage/posts" role="menuitem">내 글 관리</Link>
                    <Link to="/notifications" role="menuitem">알림</Link>
                    <Link to="/settings" role="menuitem">설정</Link>
                    {member.role === 'ADMIN' && <Link to="/admin/reports" role="menuitem">신고 관리</Link>}
                    <button type="button" role="menuitem" onClick={async () => {
                      await logout()
                      navigate('/')
                    }}>로그아웃</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to={loginPath()} className="btn btn-dark">로그인</Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
