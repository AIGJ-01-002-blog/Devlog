import { describe, expect, it, vi } from 'vitest'
import { loadOrReload } from './lazyPage'

function memory() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe('loadOrReload', () => {
  it('받기에 성공하면 그대로 돌려주고 표시를 지운다', async () => {
    const s = memory(); s.setItem('lazy-page-reloaded', '1')
    await expect(loadOrReload(() => Promise.resolve('ok'), s, vi.fn())).resolves.toBe('ok')
    expect(s.getItem('lazy-page-reloaded')).toBeNull()
  })

  it('처음 실패하면 한 번만 새로 고친다', async () => {
    const s = memory()
    let reloaded!: () => void
    const done = new Promise<void>((r) => { reloaded = r })
    const reload = vi.fn(() => reloaded())
    void loadOrReload(() => Promise.reject(new Error('404')), s, reload)
    await done
    expect(reload).toHaveBeenCalledTimes(1)
    expect(s.getItem('lazy-page-reloaded')).toBe('1')
  })

  it('새로 고친 뒤에도 실패하면 오류를 낸다', async () => {
    const s = memory(); s.setItem('lazy-page-reloaded', '1'); const reload = vi.fn()
    await expect(loadOrReload(() => Promise.reject(new Error('net')), s, reload)).rejects.toThrow('net')
    expect(reload).not.toHaveBeenCalled()
  })
})
