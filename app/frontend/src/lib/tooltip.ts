/**
 * 툴팁 (spec 055). 아이콘·버튼에 마우스를 올리거나 키보드로 초점을 옮기면 무슨 기능인지 말풍선으로 보여 준다.
 * 화면마다 툴팁 컴포넌트를 감싸지 않고, 요소에 붙은 이름(data-tip > aria-label > title)을 TooltipLayer 하나가 읽는다.
 * 그래서 새 버튼도 aria-label만 달면 툴팁이 따라온다. data-tip=""은 툴팁을 끈다.
 */

/** 툴팁을 찾는 대상. 가장 가까운 조상부터 본다. */
export const TIP_TARGET = '[data-tip], button, a[href], [role="button"], [role="menuitem"], summary, [title]'

/** 툴팁이 뜨기까지 기다리는 시간과, 방금 툴팁을 본 뒤 옆 버튼으로 옮겼을 때 바로 띄우는 시간 */
export const TIP_DELAY_MS = 350
export const TIP_WARM_MS = 400

/** 이 원본 title은 툴팁이 뜬 동안 잠깐 옮겨 둔다(브라우저 기본 말풍선과 겹치지 않게) */
export const SAVED_TITLE = 'data-tip-title'

const squash = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

/** 눈에 보이는 글자. 화면 읽기 전용(.sr-only)은 빼고, 장식(aria-hidden)이라도 보이는 글자는 넣는다. */
export function visibleText(el: Element): string {
  let out = ''
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) out += n.textContent ?? ''
    else if (n.nodeType === 1 && !(n as Element).classList.contains('sr-only')) out += ' ' + visibleText(n as Element) + ' '
  })
  return squash(out)
}

/**
 * 이 요소에 띄울 툴팁 글. 없으면 null.
 * data-tip은 그대로 쓴다. aria-label·title은 눈에 보이는 글자와 같으면 되풀이하지 않는다("로그인" 버튼에 "로그인" 말풍선은 소음이다).
 */
export function tipText(el: Element): string | null {
  const own = el.getAttribute('data-tip')
  if (own !== null) return squash(own) || null
  const label = squash(el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.getAttribute(SAVED_TITLE))
  if (!label) return null
  return label === visibleText(el) ? null : label
}

/** 툴팁을 띄울 요소: 이벤트가 일어난 곳에서 가장 가까운 대상 중 글이 있는 것 */
export function findTipTarget(from: EventTarget | null): Element | null {
  let el = from instanceof Element ? from.closest(TIP_TARGET) : null
  while (el) {
    if (tipText(el)) return el
    if (el.getAttribute('data-tip') === '') return null
    el = el.parentElement?.closest(TIP_TARGET) ?? null
  }
  return null
}

export interface Box { top: number; left: number; width: number; height: number }
export interface Placement { top: number; left: number; side: 'top' | 'bottom' }

const GAP = 8
const EDGE = 8

/** 요소 위에 가운데로 둔다. 위에 자리가 없으면 아래로, 화면 양옆 8px 안으로 당긴다. */
export function placeTip(target: Box, tip: { width: number; height: number }, viewport: { width: number; height: number }): Placement {
  const above = target.top - GAP - tip.height
  const side = above >= EDGE ? 'top' : 'bottom'
  const top = side === 'top' ? above : Math.min(target.top + target.height + GAP, viewport.height - tip.height - EDGE)
  const centered = target.left + target.width / 2 - tip.width / 2
  const left = Math.max(EDGE, Math.min(centered, viewport.width - tip.width - EDGE))
  return { top: Math.round(top), left: Math.round(left), side }
}
