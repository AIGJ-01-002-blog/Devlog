// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { Modal } from './Modal'

function Page() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button id="opener" onClick={() => setOpen(true)}>신고</button>
      {open && (
        <Modal labelledBy="t" onClose={() => setOpen(false)} closeOnBackdrop>
          <h2 id="t">글 신고</h2>
          <input id="first" />
          <button id="cancel" onClick={() => setOpen(false)}>취소</button>
        </Modal>
      )}
    </>
  )
}

describe('Modal', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('열면 안으로 초점이 가고, Esc로 닫으면 연 버튼으로 돌아온다', () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const el = document.createElement('div'); document.body.appendChild(el)
    act(() => createRoot(el).render(<Page />))
    const opener = document.getElementById('opener')!
    opener.focus()
    act(() => opener.click())

    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe('t')
    expect(document.activeElement?.id).toBe('first')

    act(() => { document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })) })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('바깥 막을 누르면 닫히고, 안쪽을 누르면 닫히지 않는다', () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const el = document.createElement('div'); document.body.appendChild(el)
    act(() => createRoot(el).render(<Page />))
    act(() => document.getElementById('opener')!.click())
    act(() => document.querySelector<HTMLElement>('[role="dialog"]')!.click())
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    act(() => document.querySelector<HTMLElement>('.dialog-backdrop')!.click())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
