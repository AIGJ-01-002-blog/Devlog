import { lazy, type ComponentType } from 'react'

const RELOAD_KEY = 'lazy-page-reloaded'

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * 새 버전이 배포되면 예전 화면 묶음 파일이 사라진다. 열어 둔 탭에서 그 화면으로 옮기면 받기가 실패하므로,
 * 한 번만 새로 고쳐 새 버전을 받는다. 새로 고친 뒤에도 실패하면(진짜 네트워크 오류) 오류를 그대로 낸다.
 */
export async function loadOrReload<T>(load: () => Promise<T>, storage: Storage | null, reload: () => void): Promise<T> {
  let mod: T
  try {
    mod = await load()
  } catch (e) {
    if (!storage || storage.getItem(RELOAD_KEY)) throw e
    storage.setItem(RELOAD_KEY, '1')
    reload()
    return new Promise<T>(() => {}) // 새로 고치는 동안 대기 화면을 유지한다
  }
  try { storage?.removeItem(RELOAD_KEY) } catch { /* 표시를 못 지워도 화면은 이미 받았다 */ }
  return mod
}

function session(): Storage | null {
  try { return window.sessionStorage } catch { return null }
}

/** 이름으로 내보낸 화면을 처음 열 때 받는다. */
export function lazyPage<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  return lazy(() => loadOrReload(load, session(), () => window.location.reload())
    .then((m) => ({ default: m[name] as ComponentType<any> })))
}
