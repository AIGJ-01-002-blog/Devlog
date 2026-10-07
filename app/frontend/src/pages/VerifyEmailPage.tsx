import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Link, useLocation } from '../lib/router'

/** 인증 메일의 링크 (004 US1). 링크를 여는 것만으로 바뀌지 않게, 화면이 한 번 확인 요청을 보낸다. */
export function VerifyEmailPage() {
  const { search } = useLocation()
  const { me, refresh } = useAuth()
  const token = search.get('token') ?? ''
  const [state, setState] = useState<'pending' | 'done' | 'expired' | 'error'>('pending')
  const [message, setMessage] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!token) return setState('expired')
    api('/api/auth/email/verify', { method: 'POST', body: { token } })
      .then(async () => { setState('done'); await refresh() })
      .catch((e) => {
        if (e instanceof ApiError && e.code === 'LINK_EXPIRED') setState('expired')
        else { setState('error'); setMessage(e instanceof ApiError ? e.message : null) }
      })
  }, [token, refresh])

  const resend = async () => {
    try {
      await api('/api/auth/email/resend', { method: 'POST' })
      setMessage('인증 메일을 다시 보냈어요.')
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : '보내지 못했어요.')
    }
  }

  return (
    <main className="container narrow auth-page">
      {state === 'pending' && <p className="muted center">확인하는 중…</p>}
      {state === 'done' && (
        <>
          <h1>인증이 완료됐어요</h1>
          <p className="muted">이제 글을 쓸 수 있어요.</p>
          <Link to={me?.authenticated ? '/write' : '/login'} className="btn btn-primary btn-block">{me?.authenticated ? '첫 글 쓰기' : '로그인'}</Link>
        </>
      )}
      {state === 'expired' && (
        <>
          <h1>링크가 만료됐어요</h1>
          <p className="muted">이미 쓴 링크이거나 24시간이 지났어요.</p>
          {me?.authenticated && !me.emailVerified
            ? <button type="button" className="btn btn-primary btn-block" onClick={resend}>인증 메일 다시 보내기</button>
            : <Link to="/login" className="btn btn-primary btn-block">로그인하고 다시 받기</Link>}
        </>
      )}
      {state === 'error' && <><h1>지금은 확인할 수 없어요</h1><p className="muted">잠시 후 링크를 다시 열어 주세요.</p></>}
      {message && <p className="muted small" role="status">{message}</p>}
    </main>
  )
}
