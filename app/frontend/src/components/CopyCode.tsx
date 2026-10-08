import { useEffect, useState } from 'react'

/** 복사 버튼이 붙은 코드 상자. 클립보드를 못 쓰면 글자를 골라 둬서 직접 복사하게 한다. */
export function CopyCode({ code, label }: { code: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  useEffect(() => {
    if (state === 'idle') return
    const t = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(t)
  }, [state])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setState('copied')
    } catch {
      setState('failed')
    }
  }
  return (
    <div className="copy-code">
      <pre aria-label={label}><code>{code}</code></pre>
      <button type="button" className="btn btn-small copy-code-button" onClick={copy}>
        {state === 'copied' ? '복사됨' : '복사'}
      </button>
      <span className="sr-only" role="status">{state === 'copied' ? `${label} 복사됨` : state === 'failed' ? '복사하지 못했어요. 직접 골라 복사해 주세요' : ''}</span>
    </div>
  )
}
