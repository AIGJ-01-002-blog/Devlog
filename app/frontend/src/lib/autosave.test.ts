import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { Autosaver, type Content, type SaveState } from './autosave'

const initial: Content = { title: '제목', contentMd: '본문' }

function setup(send = vi.fn(async (_c: Content, v: number) => ({ version: v + 1, savedAt: '2026-10-07T00:00:00Z' }))) {
  const states: SaveState[] = []
  const versions: number[] = []
  const saver = new Autosaver(initial, 1, {
    send,
    onState: (s) => states.push(s),
    onVersion: (v) => versions.push(v),
  })
  return { saver, send, states, versions }
}

describe('Autosaver', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('입력이 3초 멈추면 한 번 보낸다', async () => {
    const { saver, send, states, versions } = setup()
    saver.change({ title: '제목', contentMd: '본문1' })
    await vi.advanceTimersByTimeAsync(2000)
    saver.change({ title: '제목', contentMd: '본문12' })
    await vi.advanceTimersByTimeAsync(2999)
    expect(send).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].contentMd).toBe('본문12')
    expect(send.mock.calls[0][1]).toBe(1)
    expect(versions).toEqual([2])
    expect(states.at(-1)?.kind).toBe('saved')
    expect(saver.hasUnsaved).toBe(false)
  })

  it('계속 입력해도 30초를 넘기지 않고 보낸다', async () => {
    const { saver, send } = setup()
    for (let i = 0; i < 31; i++) {
      saver.change({ title: '제목', contentMd: '본문' + i })
      await vi.advanceTimersByTimeAsync(1000)
    }
    expect(send).toHaveBeenCalled()
    expect(send.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('보낸 뒤 5초 안에는 다시 보내지 않는다 (서버 최소 간격)', async () => {
    const { saver, send } = setup()
    saver.change({ title: '제목', contentMd: 'A' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(send).toHaveBeenCalledTimes(1)
    saver.change({ title: '제목', contentMd: 'AB' })
    await vi.advanceTimersByTimeAsync(4999 - 0)
    expect(send).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('원래 내용으로 돌아오면 보내지 않는다', async () => {
    const { saver, send } = setup()
    saver.change({ title: '제목', contentMd: '바뀜' })
    saver.change(initial)
    await vi.advanceTimersByTimeAsync(5000)
    expect(send).not.toHaveBeenCalled()
  })

  it('보내는 중에 바뀐 내용은 끝난 뒤 새 버전으로 이어서 보낸다', async () => {
    let resolve!: (v: { version: number; savedAt: string }) => void
    const send = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolve = r }))
      .mockImplementation(async (_c: Content, v: number) => ({ version: v + 1, savedAt: '2026-10-07T00:00:00Z' }))
    const { saver } = setup(send)
    saver.change({ title: '제목', contentMd: 'A' })
    await vi.advanceTimersByTimeAsync(3000)
    saver.change({ title: '제목', contentMd: 'AB' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(send).toHaveBeenCalledTimes(1)
    resolve({ version: 2, savedAt: '2026-10-07T00:00:00Z' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][0].contentMd).toBe('AB')
    expect(send.mock.calls[1][1]).toBe(2)
  })

  it('409 충돌이면 멈추고 서버 내용을 알린다', async () => {
    const server = { title: '서버', contentMd: '서버 본문', version: 5, savedAt: '2026-10-07T00:00:00Z' }
    const send = vi.fn(async () => {
      throw new ApiError(409, 'VERSION_CONFLICT', '충돌', [], { server })
    })
    const { saver, states } = setup(send)
    saver.change({ title: '제목', contentMd: 'X' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(saver.isConflict).toBe(true)
    expect(states.at(-1)).toEqual({ kind: 'conflict', server })
    saver.change({ title: '제목', contentMd: 'XY' })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(send).toHaveBeenCalledTimes(1)
    saver.reset({ title: '제목', contentMd: 'XY' }, 6)
    expect(saver.isConflict).toBe(false)
    expect(saver.version).toBe(6)
  })

  it('네트워크 오류면 오프라인 상태로 늘어나는 간격으로 다시 보낸다', async () => {
    const send = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(async (_c: Content, v: number) => ({ version: v + 1, savedAt: '2026-10-07T00:00:00Z' }))
    const { saver, states } = setup(send)
    saver.change({ title: '제목', contentMd: 'X' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(states.at(-1)?.kind).toBe('offline')
    await vi.advanceTimersByTimeAsync(2000)
    expect(send).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(4000)
    expect(send).toHaveBeenCalledTimes(3)
    expect(states.at(-1)?.kind).toBe('saved')
  })

  it('429면 Retry-After만큼 기다린다', async () => {
    const send = vi.fn()
      .mockRejectedValueOnce(new ApiError(429, 'RATE_LIMITED', '잠시 후', [], null, 10))
      .mockImplementation(async (_c: Content, v: number) => ({ version: v + 1, savedAt: '2026-10-07T00:00:00Z' }))
    const { saver } = setup(send)
    saver.change({ title: '제목', contentMd: 'X' })
    await vi.advanceTimersByTimeAsync(3000)
    await vi.advanceTimersByTimeAsync(9999)
    expect(send).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('flushNow는 기다리지 않고 keepalive로 보낸다', async () => {
    const { saver, send } = setup()
    saver.change({ title: '제목', contentMd: 'X' })
    await saver.flushNow(true)
    expect(send).toHaveBeenCalledWith({ title: '제목', contentMd: 'X' }, 1, true)
  })

  it('stop 뒤에는 보내지 않는다', async () => {
    const { saver, send } = setup()
    saver.change({ title: '제목', contentMd: 'X' })
    saver.stop()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(send).not.toHaveBeenCalled()
  })
})

describe('Autosaver 기기 저장 보조 (006)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('연결이 돌아오면 기다리던 재시도를 바로 한다', async () => {
    let fail = true
    const send = vi.fn(async (_c: Content, v: number) => {
      if (fail) throw new TypeError('network')
      return { version: v + 1, savedAt: '2026-10-07T00:00:00Z' }
    })
    const { saver, states } = setup(send)
    saver.change({ title: '제목', contentMd: '오프라인' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(states.at(-1)?.kind).toBe('offline')
    await vi.advanceTimersByTimeAsync(10_000)
    const tries = send.mock.calls.length
    fail = false
    saver.retryNow()
    await vi.advanceTimersByTimeAsync(0)
    expect(send.mock.calls.length).toBe(tries + 1)
    expect(states.at(-1)?.kind).toBe('saved')
  })

  it('처음부터 충돌이면 보내지 않고 입력은 계속 받는다', async () => {
    const { saver, send, states } = setup()
    saver.markConflict({ title: '서버', contentMd: '서버 본문', version: 5, savedAt: '2026-10-07T00:00:00Z' })
    saver.change({ title: '제목', contentMd: '기기' })
    saver.retryNow()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(send).not.toHaveBeenCalled()
    expect(states.at(-1)?.kind).toBe('conflict')
    expect(saver.hasUnsaved).toBe(true)
  })
})
