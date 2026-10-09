// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { focusables, lockScroll, trapFocus as realTrapFocus } from './modalFocus'

// 테스트마다 건 키 처리를 떼어, 앞 테스트의 Esc 처리가 다음 테스트에 끼어들지 않게 한다
const releases: Array<() => void> = []
function trapFocus(dialog: HTMLElement, onEscape: () => void) {
  const release = realTrapFocus(dialog, onEscape)
  releases.push(release)
  return release
}

function key(k: string, shift = false) {
  const e = new KeyboardEvent('keydown', { key: k, shiftKey: shift, bubbles: true, cancelable: true })
  ;(document.activeElement ?? document.body).dispatchEvent(e)
  return e
}

function setup(inner: string) {
  document.body.innerHTML = `<button id="opener">열기</button><div id="dialog">${inner}</div><a href="/x" id="outside">밖</a>`
  const opener = document.getElementById('opener')!
  opener.focus()
  return { opener, dialog: document.getElementById('dialog')! }
}

describe('trapFocus', () => {
  afterEach(() => {
    releases.splice(0).forEach((r) => r())
    document.body.innerHTML = ''
  })

  it('열리면 첫 조작 요소로, 닫히면 연 버튼으로 초점을 옮긴다', () => {
    const { opener, dialog } = setup('<h2>제목</h2><button disabled>막힘</button><input id="a"><button id="b">확인</button>')
    const release = trapFocus(dialog, () => {})
    expect(document.activeElement?.id).toBe('a')
    release()
    expect(document.activeElement).toBe(opener)
  })

  it('Tab은 대화상자 안에서만 돈다', () => {
    const { dialog } = setup('<input id="a"><button id="b">확인</button>')
    trapFocus(dialog, () => {})
    document.getElementById('b')!.focus()
    expect(key('Tab').defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('a')
    expect(key('Tab', true).defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('b')
    // 가운데에서는 브라우저 기본 이동에 맡긴다
    document.getElementById('a')!.focus()
    expect(key('Tab').defaultPrevented).toBe(false)
  })

  it('고른 라디오에서 Shift+Tab을 눌러도 대화상자 밖으로 나가지 않는다', () => {
    const { dialog } = setup(`<input type="radio" name="r" value="a" id="ra"><input type="radio" name="r" value="b" id="rb">
      <button id="ok">확인</button>`)
    trapFocus(dialog, () => {})
    const rb = document.getElementById('rb') as HTMLInputElement
    rb.checked = true
    rb.focus()
    expect(key('Tab', true).defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('ok')
  })

  it('초점이 밖으로 새어 나가 있으면 Tab으로 다시 안으로 들인다', () => {
    const { dialog } = setup('<input id="a"><button id="b">확인</button>')
    trapFocus(dialog, () => {})
    document.getElementById('outside')!.focus()
    key('Tab')
    expect(document.activeElement?.id).toBe('a')
  })

  it('Esc로 닫되, 안쪽 요소가 Esc를 이미 썼으면 닫지 않는다', () => {
    const { dialog } = setup('<input id="a">')
    const close = vi.fn()
    trapFocus(dialog, close)
    const input = document.getElementById('a')!
    input.addEventListener('keydown', (e) => e.preventDefault(), { once: true })
    key('Escape')
    expect(close).not.toHaveBeenCalled()
    key('Escape')
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('조작 요소가 없으면 대화상자 자체에 초점을 둔다', () => {
    const { dialog } = setup('<p>안내</p>')
    trapFocus(dialog, () => {})
    expect(document.activeElement).toBe(dialog)
    expect(key('Tab').defaultPrevented).toBe(true)
  })

  it('정리하면 키 처리를 떼고, 사라진 연 버튼으로는 초점을 돌리지 않는다', () => {
    const { opener, dialog } = setup('<input id="a">')
    const close = vi.fn()
    const release = trapFocus(dialog, close)
    opener.remove()
    release()
    key('Escape')
    expect(close).not.toHaveBeenCalled()
  })
})

describe('스크롤 잠금', () => {
  afterEach(() => {
    releases.splice(0).forEach((r) => r())
    document.documentElement.style.overflow = ''
    document.body.innerHTML = ''
  })

  it('모달이 열려 있는 동안 페이지 스크롤을 잠그고, 닫으면 이전 값으로 되돌린다', () => {
    document.documentElement.style.overflow = 'scroll'
    const { dialog } = setup('<input id="a">')
    const release = trapFocus(dialog, () => {})
    expect(document.documentElement.style.overflow).toBe('hidden')
    release()
    expect(document.documentElement.style.overflow).toBe('scroll')
  })

  it('겹친 모달은 마지막 것이 닫힐 때만 풀고, 같은 잠금을 두 번 풀어도 셈이 어긋나지 않는다', () => {
    const outer = lockScroll()
    const inner = lockScroll()
    inner()
    inner()
    expect(document.documentElement.style.overflow).toBe('hidden')
    outer()
    expect(document.documentElement.style.overflow).toBe('')
  })
})

describe('focusables', () => {
  it('라디오 묶음은 고른 것 하나, 고른 게 없으면 첫 것만 센다', () => {
    document.body.innerHTML = `<div id="r"><input type="radio" name="a" id="a1"><input type="radio" name="a" id="a2">
      <input type="radio" name="b" id="b1"><input type="radio" name="b" id="b2" checked><input type="radio" id="solo"></div>`
    expect(focusables(document.getElementById('r')!).map((e) => e.id)).toEqual(['a1', 'b2', 'solo'])
  })

  it('숨겨진 것과 막힌 것, tabindex=-1은 빼고 문서 순서로 준다', () => {
    document.body.innerHTML = `<div id="r"><a href="/a" id="1">a</a><a id="no-href">b</a><button id="2">c</button>
      <button disabled>d</button><span tabindex="-1">e</span><span tabindex="0" id="3">f</span>
      <div aria-hidden="true"><button>g</button></div><button hidden>h</button><textarea id="4"></textarea></div>`
    expect(focusables(document.getElementById('r')!).map((e) => e.id)).toEqual(['1', '2', '3', '4'])
  })
})
