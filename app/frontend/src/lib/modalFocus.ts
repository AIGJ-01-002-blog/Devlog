const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 상자 안에서 Tab으로 갈 수 있는 요소들 (문서 순서). 이름이 같은 라디오 묶음은 브라우저처럼 한 자리로 센다 */
export function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el.hidden || el.closest('[aria-hidden="true"]')) return false
    if (!(el instanceof HTMLInputElement) || el.type !== 'radio' || !el.name || el.checked) return true
    // 고른 것이 있으면 그것만, 없으면 묶음의 첫 라디오만 Tab 자리다
    const group = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter((r) => r.name === el.name)
    return !group.some((r) => r.checked) && group[0] === el
  })
}

// 겹쳐 연 모달 수와, 처음 잠그기 전 overflow 값. 마지막 모달이 닫힐 때만 되돌린다
let scrollLocks = 0
let savedOverflow = ''

/** 뒤쪽 페이지가 스크롤되지 않게 잠근다. 돌려준 함수로 한 번만 푼다 */
export function lockScroll(): () => void {
  const root = document.documentElement
  if (scrollLocks === 0) {
    savedOverflow = root.style.overflow
    root.style.overflow = 'hidden'
  }
  scrollLocks += 1
  let released = false
  return () => {
    if (released) return
    released = true
    scrollLocks -= 1
    if (scrollLocks === 0) root.style.overflow = savedOverflow
  }
}

/**
 * 모달 대화상자의 초점 규칙 (WAI-ARIA dialog). 열리면 안의 첫 조작 요소로, Tab은 안에서만 돌고, Esc는 닫고,
 * 닫히면(정리 함수) 연 버튼으로 초점을 돌려준다. 열려 있는 동안 뒤 페이지 스크롤을 잠근다. 안쪽 요소가 Esc를 먼저 썼으면(preventDefault) 닫지 않는다.
 */
export function trapFocus(dialog: HTMLElement, onEscape: () => void): () => void {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const unlock = lockScroll()
  const initial = focusables(dialog)[0]
  if (initial) initial.focus()
  else {
    dialog.tabIndex = -1
    dialog.focus()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (e.defaultPrevented) return
      e.preventDefault()
      onEscape()
      return
    }
    if (e.key !== 'Tab') return
    const items = focusables(dialog)
    const active = document.activeElement
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const outside = !dialog.contains(active)
    if (e.shiftKey && (outside || active === first)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (outside || active === last)) {
      e.preventDefault()
      first.focus()
    }
  }
  document.addEventListener('keydown', onKey)
  return () => {
    document.removeEventListener('keydown', onKey)
    unlock()
    if (opener?.isConnected) opener.focus()
  }
}
