import { useEffect, useState } from 'react'
import { MAIN_ID } from '../lib/focusMain'
import { ANNOUNCE_PAGE_EVENT, watchPageName } from '../lib/announcePage'

/** 화면 이름을 알리는 보이지 않는 알림 영역. 같은 이름도 다시 읽히도록 비운 뒤 다음 그림에서 채운다. */
export function PageAnnouncer() {
  const [message, setMessage] = useState('')
  useEffect(() => {
    let stop: (() => void) | null = null
    let frame = 0
    const start = () => {
      stop?.()
      const root = document.getElementById(MAIN_ID)
      if (!root) return
      stop = watchPageName(root, (name) => {
        setMessage('')
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => setMessage(name))
      })
    }
    window.addEventListener(ANNOUNCE_PAGE_EVENT, start)
    return () => {
      window.removeEventListener(ANNOUNCE_PAGE_EVENT, start)
      stop?.()
      cancelAnimationFrame(frame)
    }
  }, [])
  return <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</p>
}
