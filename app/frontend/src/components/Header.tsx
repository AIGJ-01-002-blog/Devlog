import { useEffect, useRef, useState } from 'react'
import { isStaff } from '../lib/admin'
import { loginPath, useAuth } from '../lib/auth'
import { Link, navigate, useLocation } from '../lib/router'
import { Avatar } from './Avatar'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'

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
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const member = me?.member
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="logo" data-tip="첫 화면으로"><span className="logo-mark" aria-hidden="true" />devlog</Link>
        <nav className="header-actions">
          <Link to="/search" className="btn btn-text header-search header-nav" aria-label="검색" data-tip="글·사람 검색">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2"
                 strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
          <Link to="/mcp" className="btn btn-text header-mcp" data-tip="Claude·ChatGPT 같은 AI 도구에 devlog 연결하기">AI 연결</Link>
          {member && <Link to="/feed" className="btn btn-text header-nav" data-tip="팔로우한 사람의 새 글">피드</Link>}
          <Link to="/tags" className="btn btn-text header-nav" data-tip="태그별로 글 모아 보기">태그</Link>
          {member ? (
            <>
              {isStaff(member.role) && (
                <Link to="/admin" className="btn btn-text header-admin header-nav" aria-label="관리자 페이지" data-tip="관리자 페이지: 통계·글·회원·신고 관리"
                      aria-current={path.startsWith('/admin') ? 'page' : undefined}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2"
                       strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
                </Link>
              )}
              <NotificationBell />
              <Link to="/write" className="btn btn-outline header-write" aria-label="새 글 작성" data-tip="새 글 쓰기"><span className="long">새 글 작성</span><span className="short" aria-hidden="true">글쓰기</span><span className="icon" aria-hidden="true">✏️</span></Link>
              <div className="menu" ref={menuRef}>
                <button type="button" className="menu-button" aria-haspopup="menu" aria-expanded={open} data-tip="내 메뉴: 내 블로그·글 관리·설정·로그아웃"
                        onClick={() => setOpen((o) => !o)}>
                  <Avatar src={member.profileImageUrl} name={member.nickname} seed={member.handle} />
                  <span className="sr-only">내 메뉴</span>
                </button>
                {open && (
                  <div className="menu-list" role="menu" onClick={() => setOpen(false)}>
                    <div className="menu-who">{member.nickname} <span className="muted">@{member.handle}</span></div>
                    <Link to={`/@${member.handle}`} role="menuitem">내 블로그</Link>
                    <Link to="/manage/posts" role="menuitem">내 글 관리</Link>
                    <Link to="/lists/liked" role="menuitem">좋아한 글</Link>
                    <Link to="/notifications" role="menuitem">알림</Link>
                    <Link to="/settings" role="menuitem">설정</Link>
                    {/* 지금 화면 주소를 함께 넘겨 버그가 난 곳을 남긴다 (054) */}
                    <Link to={path.startsWith('/support') ? '/support' : `/support?from=${encodeURIComponent(path)}`} role="menuitem"
                          title="궁금한 점·버그·제안을 운영자에게 보내요">문의·신고</Link>
                    <Link to="/releases" role="menuitem" title="버전마다 바뀐 점을 봐요">릴리스 노트</Link>
                    {isStaff(member.role) && <Link to="/admin" role="menuitem" title="통계·글·회원·신고·문의 관리">관리자 페이지</Link>}
                    <button type="button" role="menuitem" onClick={async () => {
                      await logout()
                      navigate('/')
                    }}>로그아웃</button>
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
