import { Link } from '../lib/router'

/**
 * 사이트 맨 아래 링크 (077). 소개·약관·처리방침·문의를 어느 화면에서나 찾게 한다(광고를 싣는 사이트는 처리방침이 늘 보여야 한다).
 * 좁은 화면에서는 아래 탭에 가리지 않게 body 아래 여백(styles.css) 위에 놓인다.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="container site-footer-links" aria-label="사이트 정보">
        <Link to="/about" data-tip="devlog가 어떤 곳이고 누가 운영하는지">소개</Link>
        <Link to="/terms" data-tip="서비스 이용약관">이용약관</Link>
        <Link to="/privacy" data-tip="모으는 정보와 광고·쿠키 안내"><b>개인정보 처리방침</b></Link>
        <Link to="/support" data-tip="질문·버그·신고 남기기">문의·신고</Link>
        <Link to="/releases" data-tip="버전마다 바뀐 것">릴리스 노트</Link>
      </nav>
    </footer>
  )
}
