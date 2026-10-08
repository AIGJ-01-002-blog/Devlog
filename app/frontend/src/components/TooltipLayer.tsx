import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { findTipTarget, placeTip, SAVED_TITLE, tipText, TIP_DELAY_MS, TIP_WARM_MS, type Placement } from '../lib/tooltip'

const TIP_ID = 'app-tooltip'

/**
 * 화면 전체에 하나만 두는 툴팁 (spec 054). 마우스를 올리면 잠깐 뒤에, 키보드로 초점이 오면 바로 띄운다.
 * Esc·누르기·스크롤로 닫히고(WCAG 1.4.13), 손가락 터치에서는 띄우지 않는다(누르면 바로 동작해야 하니까).
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<{ el: Element; text: string } | null>(null)
  const [pos, setPos] = useState<Placement | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let current: Element | null = null
    let timer = 0
    let hiddenAt = 0

    // 브라우저 기본 말풍선이 같이 뜨지 않게 title을 잠깐 옮겨 둔다. 그 사이 React가 새 title을 넣었으면 그것을 남긴다
    const stash = (el: Element) => {
      const t = el.getAttribute('title')
      if (t !== null) { el.setAttribute(SAVED_TITLE, t); el.removeAttribute('title') }
    }
    const unstash = (el: Element) => {
      const t = el.getAttribute(SAVED_TITLE)
      if (t === null) return
      el.removeAttribute(SAVED_TITLE)
      if (!el.hasAttribute('title')) el.setAttribute('title', t)
    }
    const describe = (el: Element, text: string) => {
      // 이름과 다른 설명일 때만 화면 읽기 프로그램에 덧붙인다(같은 말을 두 번 읽지 않게)
      if (text !== el.getAttribute('aria-label') && !el.hasAttribute('aria-describedby')) {
        el.setAttribute('aria-describedby', TIP_ID)
      }
    }
    const show = (el: Element) => {
      const text = tipText(el)
      if (!text) return
      stash(el)
      describe(el, text)
      setTip({ el, text })
    }
    const hide = () => {
      window.clearTimeout(timer)
      if (current) {
        unstash(current)
        if (current.getAttribute('aria-describedby') === TIP_ID) current.removeAttribute('aria-describedby')
        hiddenAt = Date.now()
      }
      current = null
      setTip(null)
    }
    const open = (el: Element, delay: number) => {
      if (el === current) return
      hide()
      current = el
      if (delay <= 0) show(el)
      else timer = window.setTimeout(() => current === el && show(el), delay)
    }

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const el = findTipTarget(e.target)
      if (!el) return
      // 방금 다른 툴팁을 봤으면 옆 버튼으로 옮길 때 기다리지 않는다
      open(el, Date.now() - hiddenAt < TIP_WARM_MS ? 0 : TIP_DELAY_MS)
    }
    const onOut = (e: PointerEvent) => {
      if (current && !(e.relatedTarget instanceof Node && current.contains(e.relatedTarget))) hide()
    }
    const onFocus = (e: FocusEvent) => {
      const el = findTipTarget(e.target)
      if (!el) return
      let keyboard = true
      try { keyboard = (e.target as Element).matches(':focus-visible') } catch { /* 옛 브라우저는 그대로 띄운다 */ }
      if (keyboard) open(el, 0)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && current) hide() }
    // 누른 뒤에는 글이 바뀔 수 있어(테마·좋아요) 닫는다. 다시 올리면 새 글로 뜬다
    const onDown = () => hide()

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', hide)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      hide()
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', hide)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [])

  // 크기를 재야 자리를 정할 수 있어 그리기 직전에 한 번 더 맞춘다
  useLayoutEffect(() => {
    if (!tip || !ref.current) { setPos(null); return }
    // 툴팁이 뜬 사이 화면이 바뀌어 대상이 사라졌으면 왼쪽 위에 남기지 않고 닫는다
    if (!tip.el.isConnected) { setPos(null); setTip(null); return }
    const r = tip.el.getBoundingClientRect()
    const box = ref.current.getBoundingClientRect()
    setPos(placeTip(r, box, { width: window.innerWidth, height: window.innerHeight }))
  }, [tip])

  if (!tip) return null
  return (
    <div ref={ref} id={TIP_ID} role="tooltip" className={`tooltip${pos ? ` tooltip-${pos.side} shown` : ''}`}
         style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 }}>
      {tip.text}
    </div>
  )
}
