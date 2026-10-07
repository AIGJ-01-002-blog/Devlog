// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ABOUT_MAX, BlogAbout } from './BlogAbout'

type Reply = { status?: number; body?: unknown }

/** 요청마다 차례로 답한다. 호출 기록은 fetch.mock.calls로 본다 */
function serve(...replies: Reply[]) {
  const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    const r = replies.shift() ?? { status: 500, body: {} }
    return r.status === 204 ? new Response(null, { status: 204 })
      : new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

async function render() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  document.cookie = 'XSRF-TOKEN=test' // 쓰기 요청 전 CSRF 쿠키를 받으러 가지 않게
  const el = document.createElement('div'); document.body.appendChild(el)
  await act(async () => { createRoot(el).render(<BlogAbout handle="minseo" />) })
  return el
}

const button = (el: HTMLElement, text: string) =>
  [...el.querySelectorAll('button')].find((b) => b.textContent === text) as HTMLButtonElement | undefined

function type(area: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(area, value)
  area.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('BlogAbout', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('남에게는 소개 HTML만 보이고 고치기 버튼이 없다', async () => {
    const fetch = serve({ body: { html: '<p>안녕하세요</p>', updatedAt: '2026-10-08T00:00:00Z', mine: false } })
    const el = await render()
    expect(String(fetch.mock.calls[0][0])).toContain('/api/members/minseo/about')
    expect(el.querySelector('.markdown')!.innerHTML).toBe('<p>안녕하세요</p>')
    expect(el.querySelector('button')).toBeNull()
  })

  it('비어 있으면 안내하고, 본인에게는 [소개 쓰기]를 보인다', async () => {
    serve({ body: { mine: false } })
    expect((await render()).textContent).toContain('소개가 없어요.')
    document.body.innerHTML = ''
    serve({ body: { contentMd: '', mine: true } })
    const el = await render()
    expect(el.textContent).toContain('아직 블로그 소개가 없어요.')
    expect(button(el, '소개 쓰기')).toBeDefined()
  })

  it('본인은 원문을 고쳐 저장하고, 저장한 소개를 다시 읽어 보인다', async () => {
    const fetch = serve(
      { body: { html: '<p>옛 소개</p>', contentMd: '옛 소개', mine: true } },
      { status: 204 },
      { body: { html: '<p>새 소개</p>', contentMd: '새 소개', mine: true } },
    )
    const el = await render()
    await act(async () => { button(el, '소개 수정')!.click() })
    const area = el.querySelector('textarea')!
    expect(area.value).toBe('옛 소개')
    expect(document.activeElement).toBe(area)
    await act(async () => { type(area, '새 소개') })
    await act(async () => { button(el, '저장')!.click() })

    const [url, init] = fetch.mock.calls[1]
    expect(String(url)).toContain('/api/me/about')
    expect(init?.method).toBe('PUT')
    expect((init?.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('test')
    expect(JSON.parse(String(init?.body))).toEqual({ contentMd: '새 소개' })
    expect(el.querySelector('textarea')).toBeNull()
    expect(el.querySelector('.markdown')!.innerHTML).toBe('<p>새 소개</p>')
  })

  it('길이를 넘으면 저장할 수 없고, 서버가 거절하면 이유를 알린다', async () => {
    serve(
      { body: { contentMd: '', mine: true } },
      { status: 400, body: { code: 'CONTENT_TOO_COMPLEX', message: '글 구조가 너무 복잡해요' } },
    )
    const el = await render()
    await act(async () => { button(el, '소개 쓰기')!.click() })
    const area = el.querySelector('textarea')!
    await act(async () => { type(area, '가'.repeat(ABOUT_MAX + 1)) })
    expect(button(el, '저장')!.disabled).toBe(true)
    expect(el.querySelector('#about-count')!.className).toContain('danger')

    await act(async () => { type(area, '> > 깊은 인용') })
    await act(async () => { button(el, '저장')!.click() })
    expect(el.querySelector('[role="alert"]')!.textContent).toBe('글 구조가 너무 복잡해요')
    expect(el.querySelector('textarea')!.value).toBe('> > 깊은 인용') // 쓰던 내용은 남는다
  })
})
