// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgreementsPage } from './AgreementsPage'

// spec 077: 처리방침 버전을 올리면 재동의 화면이 무엇이 바뀌었는지와 전문 링크를 보인다.
describe('AgreementsPage', () => {
  let root: Root
  let host: HTMLDivElement
  const terms = (privacyVersion: string) => vi.fn(async () => new Response(JSON.stringify({
    termsVersion: '2026-10-07', termsEffectiveDate: '2026-10-07', privacyVersion, privacyEffectiveDate: privacyVersion,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('광고 항목을 더한 버전이면 바뀐 내용과 전문 링크를 새 창으로 보인다', async () => {
    vi.stubGlobal('fetch', terms('2026-10-10'))
    await act(async () => { root.render(<AgreementsPage />) })
    const box = host.querySelector('.agreement-changes')
    expect(box?.textContent).toContain('7. 광고와 쿠키')
    const link = box?.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/privacy#ads')
    expect(link?.getAttribute('target')).toBe('_blank')
  })

  it('바뀐 내용을 적어 두지 않은 버전이면 그 줄을 그리지 않는다', async () => {
    vi.stubGlobal('fetch', terms('2020-01-01'))
    await act(async () => { root.render(<AgreementsPage />) })
    expect(host.querySelector('.agreement-changes')).toBeNull()
  })
})
