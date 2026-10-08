import { expect, it, vi } from 'vitest'

vi.mock('./api', () => ({ api: vi.fn(() => Promise.resolve(undefined)) }))

it('사이트 방문은 화면을 처음 열 때 한 번만 보낸다 (spec 064)', async () => {
  const { api } = await import('./api')
  const { sendVisit } = await import('./views')
  sendVisit()
  sendVisit()
  expect(api).toHaveBeenCalledTimes(1)
  expect(api).toHaveBeenCalledWith('/api/visits', { method: 'POST', keepalive: true })
})
