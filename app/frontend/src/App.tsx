import { useEffect, type ReactNode } from 'react'
import { Flash } from './components/Flash'
import { Header } from './components/Header'
import { VerifyBanner } from './components/VerifyBanner'
import { loginPath, useAuth } from './lib/auth'
import { match, navigate, useLocation } from './lib/router'
import { AgreementsPage } from './pages/AgreementsPage'
import { BlogPage } from './pages/BlogPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ManagePage } from './pages/ManagePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PostPage } from './pages/PostPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { TagPage } from './pages/TagPage'
import { TagsPage } from './pages/TagsPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SignupEmailPage } from './pages/SignupEmailPage'
import { SignupSocialPage } from './pages/SignupSocialPage'
import { TermsPage } from './pages/TermsPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { NewPostPage, WritePage } from './pages/WritePage'

export function App() {
  const { path } = useLocation()
  return (
    <>
      {!path.startsWith('/write') && <Header />}
      {path !== '/verify-email' && <VerifyBanner />}
      <Flash path={path} />
      <AgreementGate path={path}>{route(path)}</AgreementGate>
    </>
  )
}

function route(path: string): ReactNode {
  let p: Record<string, string> | null
  if (path === '/') return <HomePage />
  if ((p = match('/@:handle/posts/:id', path))) return <PostPage key={`${p.handle}/${p.id}`} handle={p.handle} id={p.id} />
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
  if (path === '/notifications') return <RequireLogin><NotificationsPage /></RequireLogin>
  if (path === '/settings') return <RequireLogin><SettingsPage /></RequireLogin>
  return <NotFoundPage />
}

function RequireLogin({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()
  useEffect(() => {
    if (!loading && !me?.authenticated) navigate(loginPath(), { replace: true })
  }, [loading, me])
  if (loading || !me?.authenticated) return <main className="container"><p className="muted center">불러오는 중…</p></main>
  return <>{children}</>
}

/** 재동의가 필요하면 동의 화면만 쓸 수 있다 (서버도 403 AGREEMENT_REQUIRED로 막는다). */
function AgreementGate({ path, children }: { path: string; children: ReactNode }) {
  const { me } = useAuth()
  useEffect(() => {
    if (me?.agreementRequired && path !== '/agreements') {
      navigate(`/agreements?redirect=${encodeURIComponent(path)}`, { replace: true })
    }
  }, [me, path])
  return <>{children}</>
}
