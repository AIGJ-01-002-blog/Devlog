import { useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

/** 메일 인증 전 회원에게 쓰기 행동이 막혀 있다고 알리고 인증 메일을 다시 보낼 수 있게 한다 (004 US1). */
export function VerifyBanner() {
  const { me, refresh } = useAuth()
  const [message, setMessage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  if (!me?.authenticated || me.emailVerified) return null

  const resend = async () => {
    setSending(true)
    try {
      await api('/api/auth/email/resend', { method: 'POST' })
      setMessage('인증 메일을 다시 보냈어요. 이전 메일의 링크는 더 이상 쓸 수 없어요.')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ALREADY_VERIFIED') {
        await refresh()
      } else if (e instanceof ApiError && e.status === 429) {
        setMessage(e.retryAfter && e.retryAfter > 120 ? '오늘은 더 보낼 수 없어요. 내일 다시 시도해 주세요.'
          : `잠시 후 다시 보낼 수 있어요${e.retryAfter ? ` (${e.retryAfter}초 뒤)` : ''}.`)
      } else {
        setMessage(e instanceof ApiError ? e.message : '보내지 못했어요. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="verify-banner" role="status">
      <div className="container verify-inner">
        <span>이메일 인증을 마쳐야 글을 쓸 수 있어요. 받은 메일의 링크를 눌러 주세요.</span>
        <button type="button" className="btn btn-text" onClick={resend} disabled={sending}>
          {sending ? '보내는 중…' : '인증 메일 다시 보내기'}
        </button>
        {message && <span className="small">{message}</span>}
      </div>
    </div>
  )
}
