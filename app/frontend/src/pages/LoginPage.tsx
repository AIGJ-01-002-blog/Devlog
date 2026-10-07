import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fullDate } from '../lib/format'
import { navigate, useLocation } from '../lib/router'

const MESSAGES: Record<string, string> = {
  SOCIAL_LOGIN_FAILED: 'GitHub 로그인을 마치지 못했어요. 다시 시도해 주세요.',
  NO_VERIFIED_EMAIL: 'GitHub 계정에 인증된 이메일이 없어요. GitHub에서 이메일을 인증한 뒤 다시 시도해 주세요.',
  TEMPORARILY_UNAVAILABLE: '지금은 로그인할 수 없어요. 잠시 후 다시 시도해 주세요.',
  TOO_MANY_REQUESTS: '로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.',
}

interface LoginError {
  code: string
  suspendedUntil: string | null
  reason: string | null
}

export function LoginPage() {
  const { search } = useLocation()
  const { me } = useAuth()
  const [detail, setDetail] = useState<LoginError | null>(null)
  const error = search.get('error')
  const redirect = search.get('redirect') ?? '/'

  useEffect(() => {
    if (me?.authenticated) navigate(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/', { replace: true })
  }, [me, redirect])

  useEffect(() => {
    if (error === 'ACCOUNT_SUSPENDED') api<LoginError | undefined>('/api/auth/login-error').then((d) => d && setDetail(d)).catch(() => undefined)
  }, [error])

  let message = error ? MESSAGES[error] ?? '로그인하지 못했어요. 다시 시도해 주세요.' : null
  if (error === 'ACCOUNT_SUSPENDED') {
    message = `정지된 계정이에요${detail?.suspendedUntil ? ` (${fullDate(detail.suspendedUntil)}까지)` : ''}.${detail?.reason ? ` 사유: ${detail.reason}` : ''}`
  }

  return (
    <main className="container narrow auth-page">
      <h1>로그인</h1>
      <p className="muted">개발 기록을 남기고 나누는 블로그예요.</p>
      {message && <div className="banner banner-warn" role="alert">{message}</div>}
      <a className="btn btn-github" href={`/oauth2/authorization/github?redirect=${encodeURIComponent(redirect)}`}>
        <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub로 계속하기
      </a>
      <p className="muted small">처음이면 블로그 주소와 닉네임을 정하고 가입을 마쳐요.</p>
    </main>
  )
}
