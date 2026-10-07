// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareButton } from './ShareButton'

describe('ShareButton', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('누르면 글 전체 주소를 복사하고 잠깐 알린다', async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const el = document.createElement('div'); document.body.appendChild(el)
    act(() => createRoot(el).render(<ShareButton path="/@minseo/42" title="제목" />))

    const status = el.querySelector('[role="status"]')!
    expect(status.textContent).toBe('')
    await act(async () => { el.querySelector('button')!.click() })
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/@minseo/42`)
    expect(status.textContent).toBe('링크를 복사했어요')

    act(() => { vi.advanceTimersByTime(3000) })
    expect(status.textContent).toBe('')
  })

  it('복사할 수 없으면 직접 복사하라고 알린다', async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.stubGlobal('navigator', {})
    const el = document.createElement('div'); document.body.appendChild(el)
    act(() => createRoot(el).render(<ShareButton path="/@minseo/42" title="제목" />))
    await act(async () => { el.querySelector('button')!.click() })
    const status = el.querySelector('[role="status"]')!
    expect(status.textContent).toContain('복사하지 못했어요')
    expect(status.className).toContain('error')
  })

  it('같은 결과로 다시 누르면 3초를 새로 센다', async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => {}) } })
    const el = document.createElement('div'); document.body.appendChild(el)
    act(() => createRoot(el).render(<ShareButton path="/@minseo/42" title="제목" />))
    const status = el.querySelector('[role="status"]')!
    await act(async () => { el.querySelector('button')!.click() })
    act(() => { vi.advanceTimersByTime(2000) })
    await act(async () => { el.querySelector('button')!.click() })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(status.textContent).toBe('링크를 복사했어요')
    act(() => { vi.advanceTimersByTime(1000) })
    expect(status.textContent).toBe('')
  })

  it('먼저 누른 요청이 늦게 끝나도 마지막 결과를 보인다', async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const pending: { resolve: () => void; reject: (e: Error) => void }[] = []
    const writeText = vi.fn(() => new Promise<void>((resolve, reject) => { pending.push({ resolve, reject }) }))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const el = document.createElement('div'); document.body.appendChild(el)
    act(() => createRoot(el).render(<ShareButton path="/@minseo/42" title="제목" />))
    const status = el.querySelector('[role="status"]')!
    act(() => { el.querySelector('button')!.click() })
    act(() => { el.querySelector('button')!.click() })
    await act(async () => { pending[1].resolve() })
    expect(status.textContent).toBe('링크를 복사했어요')
    await act(async () => { pending[0].reject(new Error('late')) })
    expect(status.textContent).toBe('링크를 복사했어요')
  })
})
