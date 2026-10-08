// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiConnectSection } from './AiConnectSection'

// spec 052: 토큰 원문은 만든 직후 한 번만 보이고, 목록에는 앞부분만 남는다.
const listed = { id: 1, name: '노트북', prefix: 'dvl_abcd', scope: 'READ', createdAt: '2026-10-08T00:00:00Z',
  expiresAt: '2027-01-06T00:00:00Z', lastUsedAt: null, expired: false, oauth: false }
const chatgpt = { ...listed, id: 3, name: 'ChatGPT', prefix: 'dvl_zzzz', scope: 'WRITE', oauth: true }
const secret = 'dvl_' + 'x'.repeat(43)

describe('AiConnectSection', () => {
  let root: Root
  let host: HTMLDivElement
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    document.cookie = 'XSRF-TOKEN=test'
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ token: { ...listed, id: 2, name: 'Claude Code', prefix: secret.slice(0, 8), scope: 'WRITE' }, secret }),
          { status: 201, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify(url.endsWith('/api/me/tokens') ? [listed, chatgpt] : {}), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('목록에는 앞부분만, 만든 직후에는 원문과 연결 명령을 보여 준다', async () => {
    await act(async () => { root.render(<AiConnectSection />) })
    expect(host.textContent).toContain('노트북')
    expect(host.textContent).toContain('dvl_abcd…')
    expect(host.textContent).not.toContain(secret)
    // 로그인(OAuth)으로 연결한 앱은 토큰 앞부분 대신 표시가 붙고 [연결 끊기]다
    expect(host.textContent).toContain('로그인 연결')
    expect(host.textContent).not.toContain('dvl_zzzz')
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === '연결 끊기')).toBe(true)

    await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    expect(host.textContent).toContain(secret)
    expect(host.textContent).toContain(`claude mcp add --transport http devlog`)
    expect(host.textContent).toContain('다시 볼 수 없으니')

    await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === '다 복사했어요')!.click() })
    expect(host.textContent).not.toContain(secret)
    expect(host.querySelectorAll('.token-row')).toHaveLength(3)
  })
})
