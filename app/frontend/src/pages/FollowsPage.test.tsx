// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FollowsPage } from './FollowsPage'

// spec 079: 주인이 목록을 비공개로 두면 "비공개 계정입니다"만 보이고, 탭의 수는 그대로다.
describe('FollowsPage', () => {
  let root: Root
  let host: HTMLDivElement
  const profile = { handle: 'owner', nickname: '주인', followerCount: 3, followingCount: 2 }
  const server = (page: object) => vi.fn(async (url: string) => new Response(
    JSON.stringify(url.includes('/followers') || url.includes('/following') ? page : profile),
    { status: 200, headers: { 'Content-Type': 'application/json' } }))
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

  it('비공개 목록이면 안내만 보이고 빈 목록 문구는 그리지 않는다', async () => {
    vi.stubGlobal('fetch', server({ items: [], nextCursor: null, hidden: true }))
    await act(async () => { root.render(<FollowsPage handle="owner" direction="followers" />) })
    expect(host.querySelector('.follow-hidden')?.textContent).toContain('비공개 계정입니다')
    expect(host.querySelector('.empty')).toBeNull()
    expect(host.querySelector('.follow-tabs')?.textContent).toContain('팔로워 3')
  })

  it('공개 목록이 비어 있으면 원래 빈 문구를 보인다', async () => {
    vi.stubGlobal('fetch', server({ items: [], nextCursor: null, hidden: false }))
    await act(async () => { root.render(<FollowsPage handle="owner" direction="following" />) })
    expect(host.querySelector('.follow-hidden')).toBeNull()
    expect(host.querySelector('.empty')?.textContent).toBe('아직 팔로우한 사람이 없어요')
  })
})
