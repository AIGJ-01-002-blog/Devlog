import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { sendPage, VIEW_DWELL_MS, watchView } from './views'

vi.mock('./api', () => ({ api: vi.fn(() => Promise.resolve(undefined)) }))

let callback: (entries: { isIntersecting: boolean }[]) => void
const disconnect = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  disconnect.mockClear()
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: typeof callback) { callback = cb }
    observe() {}
    disconnect = disconnect
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function visibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('watchView', () => {
  it('1초 연속으로 보이면 한 번만 보낸다', () => {
    visibility('visible')
    const send = vi.fn()
    watchView(document.body, send)
    callback([{ isIntersecting: true }])
    vi.advanceTimersByTime(VIEW_DWELL_MS - 1)
    expect(send).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(send).toHaveBeenCalledTimes(1)
    callback([{ isIntersecting: false }])
    callback([{ isIntersecting: true }])
    vi.advanceTimersByTime(VIEW_DWELL_MS * 3)
    expect(send).toHaveBeenCalledTimes(1)
    expect(disconnect).toHaveBeenCalled()
  })

  it('탭이 가려지면 처음부터 다시 잰다', () => {
    visibility('visible')
    const send = vi.fn()
    watchView(document.body, send)
    callback([{ isIntersecting: true }])
    vi.advanceTimersByTime(800)
    visibility('hidden')
    vi.advanceTimersByTime(5000)
    expect(send).not.toHaveBeenCalled()
    visibility('visible')
    vi.advanceTimersByTime(800)
    expect(send).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('화면 밖이거나 정리되면 보내지 않는다', () => {
    visibility('visible')
    const send = vi.fn()
    const stop = watchView(document.body, send)
    callback([{ isIntersecting: false }])
    vi.advanceTimersByTime(5000)
    callback([{ isIntersecting: true }])
    vi.advanceTimersByTime(500)
    stop()
    vi.advanceTimersByTime(5000)
    expect(send).not.toHaveBeenCalled()
  })
})

describe('sendPage', () => {
  it('처음 화면은 방문으로 이전 주소와 함께, 그 뒤 옮긴 화면은 화면 순위로만 보낸다 (spec 064·070)', () => {
    vi.mocked(api).mockClear()
    Object.defineProperty(document, 'referrer', { value: 'https://search.naver.com/search.naver?query=x', configurable: true })
    sendPage('/')
    sendPage('/')
    sendPage('/tags')
    expect(api).toHaveBeenCalledTimes(2)
    expect(api).toHaveBeenNthCalledWith(1, '/api/visits',
      { method: 'POST', keepalive: true, body: { first: true, path: '/', referrer: 'https://search.naver.com/search.naver?query=x' } })
    expect(api).toHaveBeenNthCalledWith(2, '/api/visits', { method: 'POST', keepalive: true, body: { first: false, path: '/tags' } })
  })

  it('화면을 연 채 한국 시간 자정이 지나면 다음 화면을 다시 방문으로 보낸다', () => {
    vi.mocked(api).mockClear()
    vi.setSystemTime(new Date('2026-10-09T14:59:00Z')) // 23:59 KST
    sendPage('/a')
    vi.setSystemTime(new Date('2026-10-09T15:01:00Z')) // 다음 날 00:01 KST
    sendPage('/b')
    expect(vi.mocked(api).mock.calls[1][1]).toMatchObject({ body: { first: true, path: '/b' } })
  })
})
