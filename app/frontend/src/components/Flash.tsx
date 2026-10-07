import { useEffect, useState } from 'react'
import { takeFlash } from '../lib/flash'

export function Flash({ path }: { path: string }) {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    const m = takeFlash()
    if (m) setMessage(m)
  }, [path])
  if (!message) return null
  return (
    <div className="container">
      <div className="banner banner-warn flash" role="status">
        <span>{message}</span>
        <button type="button" className="btn btn-text" onClick={() => setMessage(null)} aria-label="닫기">✕</button>
      </div>
    </div>
  )
}
