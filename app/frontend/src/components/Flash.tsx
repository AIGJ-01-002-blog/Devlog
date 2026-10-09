import { useEffect, useState } from 'react'
import { takeFlash } from '../lib/flash'

export function Flash({ path }: { path: string }) {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    const m = takeFlash()
    if (m) setMessage(m)
  }, [path])
  // 알림 영역은 늘 두고 안의 글만 바꿔야 화면 읽기 프로그램이 놓치지 않는다
  return (
    <div className="container" role="status">
      {message && (
        <div className="banner banner-warn flash">
          <span>{message}</span>
          <button type="button" className="btn btn-text" onClick={() => setMessage(null)} aria-label="닫기">✕</button>
        </div>
      )}
    </div>
  )
}
