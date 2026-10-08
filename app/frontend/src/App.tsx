import { Suspense, useEffect, type ReactNode } from 'react'
import { Flash } from './components/Flash'
import { Header } from './components/Header'
import { SkipLink } from './components/SkipLink'
import { PageAnnouncer } from './components/PageAnnouncer'
import { MAIN_ID } from './lib/focusMain'
import { VerifyBanner } from './components/VerifyBanner'
import { loginPath, useAuth } from './lib/auth'
import { match, navigate, useLocation } from './lib/router'
import { BlogPage } from './pages/BlogPage'
import { SeriesPage } from './pages/SeriesPage'
import { LikedPage } from './pages/LikedPage'
import { FeedPage } from './pages/FeedPage'
import { FollowsPage } from './pages/FollowsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PostPage } from './pages/PostPage'
import { SearchPage } from './pages/SearchPage'
import { TagPage } from './pages/TagPage'
import { TagsPage } from './pages/TagsPage'
import { withdrawnRedirect } from './lib/withdraw'
import { lazyPage } from './lib/lazyPage'
import { PageErrorBoundary } from './components/PageErrorBoundary'

// 글 읽기(홈·글·블로그·태그·검색·피드)는 첫 묶음에 두고, 쓰기·설정·가입·관리자 화면은 처음 열 때 받는다.
// 독자가 받는 첫 JS를 줄이려는 것이다 (spec 028).
const AdminMemberPage = lazyPage(() => import('./pages/AdminMemberPage'), 'AdminMemberPage')
const AdminReportPage = lazyPage(() => import('./pages/AdminReportPage'), 'AdminReportPage')
const AdminReportsPage = lazyPage(() => import('./pages/AdminReportsPage'), 'AdminReportsPage')
const AgreementsPage = lazyPage(() => import('./pages/AgreementsPage'), 'AgreementsPage')
const ManagePage = lazyPage(() => import('./pages/ManagePage'), 'ManagePage')
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'), 'SettingsPage')
const ForgotPasswordPage = lazyPage(() => import('./pages/ForgotPasswordPage'), 'ForgotPasswordPage')
const ResetPasswordPage = lazyPage(() => import('./pages/ResetPasswordPage'), 'ResetPasswordPage')
const SignupEmailPage = lazyPage(() => import('./pages/SignupEmailPage'), 'SignupEmailPage')
const SignupSocialPage = lazyPage(() => import('./pages/SignupSocialPage'), 'SignupSocialPage')
const TermsPage = lazyPage(() => import('./pages/TermsPage'), 'TermsPage')
const VerifyEmailPage = lazyPage(() => import('./pages/VerifyEmailPage'), 'VerifyEmailPage')
const NewPostPage = lazyPage(() => import('./pages/WritePage'), 'NewPostPage')
const WritePage = lazyPage(() => import('./pages/WritePage'), 'WritePage')
const RestorePage = lazyPage(() => import('./pages/RestorePage'), 'RestorePage')
const WithdrawnPage = lazyPage(() => import('./pages/WithdrawnPage'), 'WithdrawnPage')
const WithdrawPage = lazyPage(() => import('./pages/WithdrawPage'), 'WithdrawPage')
const McpPage = lazyPage(() => import('./pages/McpPage'), 'McpPage')
const OAuthAuthorizePage = lazyPage(() => import('./pages/OAuthAuthorizePage'), 'OAuthAuthorizePage')

export function App() {
  const { path } = useLocation()
  return (
    <>
      <SkipLink />
      <PageAnnouncer />
      {!path.startsWith('/write') && path !== '/account/restore' && <Header />}
      {path !== '/verify-email' && <VerifyBanner />}
      <Flash path={path} />
      <div id={MAIN_ID} tabIndex={-1}>
        <WithdrawnGate path={path}><AgreementGate path={path}><PageErrorBoundary path={path}><Suspense fallback={<Loading />}>{route(path)}</Suspense></PageErrorBoundary></AgreementGate></WithdrawnGate>
      </div>
    </>
  )
}

function route(path: string): ReactNode {
  let p: Record<string, string> | null
  if (path === '/') return <HomePage />
  if ((p = match('/@:handle/posts/:id', path))) return <PostPage key={`${p.handle}/${p.id}`} handle={p.handle} id={p.id} />
  if ((p = match('/@:handle/followers', path))) return <FollowsPage key={`${p.handle}/f`} handle={p.handle} direction="followers" />
  if ((p = match('/@:handle/following', path))) return <FollowsPage key={`${p.handle}/g`} handle={p.handle} direction="following" />
  if ((p = match('/@:handle/series/:slug', path))) return <SeriesPage key={`${p.handle}/s/${p.slug}`} handle={p.handle} slug={p.slug} />
  if ((p = match('/@:handle/series', path))) return <BlogPage key={p.handle} handle={p.handle} tab="series" />
  if ((p = match('/@:handle/about', path))) return <BlogPage key={p.handle} handle={p.handle} tab="about" />
  if ((p = match('/@:handle', path))) return <BlogPage key={p.handle} handle={p.handle} />
  if (path === '/search') return <SearchPage />
  if (path === '/mcp') return <McpPage />
  if (path === '/oauth/authorize') return <RequireLogin><OAuthAuthorizePage /></RequireLogin>
  if (path === '/tags') return <TagsPage />
  if ((p = match('/tags/:name', path))) return <TagPage key={p.name} name={p.name} />
  if (path === '/login') return <LoginPage />
  if (path === '/signup') return <SignupEmailPage />
  if (path === '/signup/social') return <SignupSocialPage />
  if (path === '/forgot-password') return <ForgotPasswordPage />
  if (path === '/reset-password') return <ResetPasswordPage />
  if (path === '/verify-email') return <VerifyEmailPage />
  if (path === '/agreements') return <AgreementsPage />
  if (path === '/terms') return <TermsPage kind="terms" />
  if (path === '/privacy') return <TermsPage kind="privacy" />
  if (path === '/write') return <RequireLogin><NewPostPage /></RequireLogin>
  if ((p = match('/write/:id', path))) return <RequireLogin><WritePage key={p.id} id={p.id} /></RequireLogin>
  if (path === '/manage/posts') return <RequireLogin><ManagePage /></RequireLogin>
  if (path === '/feed') return <RequireLogin><FeedPage /></RequireLogin>
  if (path === '/lists/liked') return <RequireLogin><LikedPage /></RequireLogin>
  if (path === '/notifications') return <RequireLogin><NotificationsPage /></RequireLogin>
  if (path === '/settings') return <RequireLogin><SettingsPage /></RequireLogin>
  if (path === '/settings/withdraw') return <RequireLogin><WithdrawPage /></RequireLogin>
  if (path === '/withdrawn') return <WithdrawnPage />
  if (path === '/account/restore') return <RequireLogin><RestorePage /></RequireLogin>
  if (path === '/admin/reports') return <RequireAdmin><AdminReportsPage /></RequireAdmin>
  if ((p = match('/admin/reports/:id', path))) return <RequireAdmin><AdminReportPage key={p.id} id={p.id} /></RequireAdmin>
  if ((p = match('/admin/members/:handle', path))) return <RequireAdmin><AdminMemberPage key={p.handle} handle={p.handle} /></RequireAdmin>
  return <NotFoundPage />
}

function Loading() {
  return <main className="container"><p className="muted center">불러오는 중…</p></main>
}

function RequireLogin({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()
  useEffect(() => {
    if (!loading && !me?.authenticated) navigate(loginPath(), { replace: true })
  }, [loading, me])
  if (loading || !me?.authenticated) return <Loading />
  return <>{children}</>
}

/** 관리자 화면: 서버가 비회원은 로그인으로, 일반 회원은 404로 보내므로 여기서는 화면 안에서 옮겨 온 경우만 막는다. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()
  if (loading) return <Loading />
  if (!me?.authenticated) return <RequireLogin>{children}</RequireLogin>
  if (me.member?.role !== 'ADMIN') return <NotFoundPage />
  return <>{children}</>
}

/** 탈퇴 유예 회원은 복구 화면만 쓴다 (020 FR-016, 서버도 403 ACCOUNT_WITHDRAWN으로 막는다). */
function WithdrawnGate({ path, children }: { path: string; children: ReactNode }) {
  const { me, loading } = useAuth()
  const to = loading ? null : withdrawnRedirect(me?.authenticated ? me.member?.status : undefined, path)
  useEffect(() => {
    if (to) navigate(to, { replace: true })
  }, [to])
  if (to) return null
  return <>{children}</>
}

/** 재동의가 필요하면 동의 화면만 쓸 수 있다 (서버도 403 AGREEMENT_REQUIRED로 막는다). */
function AgreementGate({ path, children }: { path: string; children: ReactNode }) {
  const { me } = useAuth()
  useEffect(() => {
    // 탈퇴 유예 회원은 복구 화면만 쓴다(WithdrawnGate). 재동의 요청도 서버가 막으므로 여기서 보내지 않는다
    if (me?.agreementRequired && me.member?.status !== 'WITHDRAWN' && path !== '/agreements') {
      navigate(`/agreements?redirect=${encodeURIComponent(path)}`, { replace: true })
    }
  }, [me, path])
  return <>{children}</>
}
