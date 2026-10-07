import { useEffect, useState } from 'react'
import { absoluteUrl, browserShareEnv, shareLink, type ShareResult } from '../lib/share'

const MESSAGES: Partial<Record<ShareResult, string>> = {
  copied: '링크를 복사했어요',
  failed: '복사하지 못했어요. 주소창의 링크를 복사해 주세요',
}

/** 글 상세 공유 버튼 (spec 039). 결과는 화면 읽기 프로그램도 읽도록 status로 잠깐 보인다. */
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [result, setResult] = useState<ShareResult | null>(null)

  useEffect(() => {
    if (!result) return
    const t = setTimeout(() => setResult(null), 3000)
    return () => clearTimeout(t)
  }, [result])

  const press = async () => {
    setResult(await shareLink(absoluteUrl(path, window.location.origin), title, browserShareEnv()))
  }

  const message = result ? MESSAGES[result] : undefined
  return (
    <span className="share">
      <button type="button" className="like-button" onClick={press}>
        <span aria-hidden="true">↗</span> 공유
      </button>
      <span className={`like-notice${result === 'failed' ? ' error' : ''}`} role="status">{message ?? ''}</span>
    </span>
  )
}
