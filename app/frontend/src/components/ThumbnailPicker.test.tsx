// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThumbnailPicker } from './ThumbnailPicker'
import type { ThumbnailChoice } from '../lib/postThumbnail'

function render(value: ThumbnailChoice, content: string) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const onChange = vi.fn()
  const el = document.createElement('div'); document.body.appendChild(el)
  act(() => createRoot(el).render(<ThumbnailPicker value={value} content={content} onChange={onChange} onBusy={() => {}} />))
  const button = (label: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === label)
  return { el, onChange, button }
}

describe('ThumbnailPicker', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('고르지 않았으면 본문 첫 사진을 보여 주고 없애기를 고를 수 있다', () => {
    const { el, onChange, button } = render({ kind: 'auto' }, '![](https://img/1.png)')
    expect(el.querySelector('img')!.getAttribute('src')).toBe('https://img/1.png')
    expect(button('본문 첫 사진으로')).toBeUndefined()
    act(() => button('썸네일 없애기')!.click())
    expect(onChange).toHaveBeenCalledWith({ kind: 'none' })
  })

  it('없앤 상태면 사진 없이 보여 주고 본문 첫 사진으로 되돌릴 수 있다', () => {
    const { el, onChange, button } = render({ kind: 'none' }, '![](https://img/1.png)')
    expect(el.querySelector('img')).toBeNull()
    expect(el.textContent).toContain('썸네일 없음')
    expect(button('썸네일 없애기')).toBeUndefined()
    act(() => button('본문 첫 사진으로')!.click())
    expect(onChange).toHaveBeenCalledWith({ kind: 'auto' })
  })
})
