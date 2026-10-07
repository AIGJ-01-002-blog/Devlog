import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Flash } from './components/Flash'
import { Header } from './components/Header'
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

// 글 읽기(홈·글·블로그·태그·검색·피드)는 첫 묶음에 두고, 쓰기·설정·가입·관리자 화면은 처음 열 때 받는다.
// 독자가 받는 첫 JS를 줄이려는 것이다 (spec 028).
const AdminMemberPage = lazy(() => import('./pages/AdminMemberPage').then((m) => ({ default: m.AdminMemberPage })))
const AdminReportPage = lazy(() => import('./pages/AdminReportPage').then((m) => ({ default: m.AdminReportPage })))
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })))
const AgreementsPage = lazy(() => import('./pages/AgreementsPage').then((m) => ({ default: m.AgreementsPage })))
const ManagePage = lazy(() => import('./pages/ManagePage').then((m) => ({ default: m.ManagePage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const SignupEmailPage = lazy(() => import('./pages/SignupEmailPage').then((m) => ({ default: m.SignupEmailPage })))
const SignupSocialPage = lazy(() => import('./pages/SignupSocialPage').then((m) => ({ default: m.SignupSocialPage })))
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })))
const NewPostPage = lazy(() => import('./pages/WritePage').then((m) => ({ default: m.NewPostPage })))
const WritePage = lazy(() => import('./pages/WritePage').then((m) => ({ default: m.WritePage })))
const RestorePage = lazy(() => import('./pages/RestorePage').then((m) => ({ default: m.RestorePage })))
const WithdrawnPage = lazy(() => import('./pages/WithdrawnPage').then((m) => ({ default: m.WithdrawnPage })))
const WithdrawPage = lazy(() => import('./pages/WithdrawPage').then((m) => ({ default: m.WithdrawPage })))

export function App() {
  const { path } = useLocation()
  return (
    <>
      {!path.startsWith('/write') && path !== '/account/restore' && <Header />}
      {path !== '/verify-email' && <VerifyBanner />}
      <Flash path={path} />
      <WithdrawnGate path={path}><AgreementGate path={path}><Suspense fallback={<Loading />}>{route(path)}</Suspense></AgreementGate></WithdrawnGate>
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
  if ((p = match('/@:handle', path))) return <BlogPage key={p.handle} handle={p.handle} />
  if (path === '/search') return <SearchPage />
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
