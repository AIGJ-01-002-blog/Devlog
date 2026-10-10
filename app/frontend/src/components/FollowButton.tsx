import { useEffect, useRef, useState } from 'react'
import { loginPath, useAuth } from '../lib/auth'
import { FOLLOW_ERROR, followApi, followLabel, type FollowState } from '../lib/follow'
import { navigate } from '../lib/router'
import { t } from '../lib/i18n'

/**
 * 팔로우 버튼 (016 FR-008·FR-009). 누르면 바로 바뀌고, 보내는 중에 또 누르면 끝난 뒤 마지막 상태만 보낸다.
 * 실패하면 서버가 마지막으로 확인해 준 상태로 돌리고 안내한다. 언팔로우는 확인 창 없이 된다.
 * 비회원은 로그인 화면으로 갔다가 이 페이지로 돌아온다.
 */
export function FollowButton({ handle, following, onChange, small = false }: {
  handle: string
  following: boolean
  onChange?: (state: FollowState) => void
  small?: boolean
}) {
  const { me } = useAuth()
  const [on, setOn] = useState(following)
  const [hover, setHover] = useState(false)
  const [error, setError] = useState(false)
  const confirmed = useRef(following)
  const wanted = useRef(following)
  const sending = useRef(false)

  useEffect(() => {
    if (!sending.current) {
      setOn(following)
      confirmed.current = following
      wanted.current = following
    }
  }, [following])

  const flush = async () => {
    if (sending.current) return
    sending.current = true
    try {
      while (wanted.current !== confirmed.current) {
        const target = wanted.current
        const state = await followApi.set(handle, target)
        confirmed.current = state.following
        onChange?.(state)
      }
    } catch {
      wanted.current = confirmed.current
      setOn(confirmed.current)
      setError(true)
    } finally {
      sending.current = false
    }
  }

  const click = () => {
    if (!me?.member) return navigate(loginPath())
    const next = !on
    setOn(next)
    setError(false)
    // 팔로우 직후 마우스가 버튼 위에 그대로 있어도 [언팔로우]로 바로 바뀌지 않게
    setHover(false)
    wanted.current = next
    void flush()
  }

  return (
    <span className="follow-wrap">
      <button type="button" className={`btn ${on ? 'btn-outline following' : 'btn-primary'}${small ? ' btn-small' : ''}`}
              aria-pressed={on} onClick={click}
              data-tip={on ? t('팔로우를 그만둬요(상대에게 알리지 않아요)') : t('상대 수락 없이 새 글을 피드와 알림으로 받아요')}
              onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
              onFocus={(e) => setHover(e.currentTarget.matches(':focus-visible'))} onBlur={() => setHover(false)}>
        {followLabel(on, hover)}
      </button>
      {error && <span className="error small" role="alert">{FOLLOW_ERROR}</span>}
    </span>
  )
}
