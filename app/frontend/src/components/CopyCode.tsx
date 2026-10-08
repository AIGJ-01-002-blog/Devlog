import { useEffect, useRef, useState } from 'react'

/** 복사 버튼이 붙은 코드 상자. 클립보드를 못 쓰면 글자를 골라 둬서 직접 복사하게 한다. */
export function CopyCode({ code, label }: { code: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const codeRef = useRef<HTMLElement>(null)
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
      // 클립보드를 못 쓰면 글자를 골라 둔다. 사용자는 바로 Ctrl+C만 누르면 된다
      const el = codeRef.current
      const sel = window.getSelection()
      if (el && sel) {
        const range = document.createRange()
        range.selectNodeContents(el)
        sel.removeAllRanges()
        sel.addRange(range)
      }
      setState('failed')
    }
  }
  return (
    <div className="copy-code">
      <pre aria-label={label}><code ref={codeRef}>{code}</code></pre>
      <button type="button" className="btn btn-small copy-code-button" data-tip="코드를 클립보드에 복사해요" onClick={copy}>
        {state === 'copied' ? '복사됨' : '복사'}
      </button>
      <span className="sr-only" role="status">{state === 'copied' ? `${label} 복사됨` : state === 'failed' ? '복사하지 못했어요. 글자를 골라 두었으니 Ctrl+C로 복사해 주세요' : ''}</span>
    </div>
  )
}
