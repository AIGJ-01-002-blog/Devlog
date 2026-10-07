// 작은 라우터: History API + 경로 패턴. 서버가 같은 주소를 그리므로(SSR 머리말) 주소 규칙은 서버와 같다.
import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

type Listener = () => void
const listeners = new Set<Listener>()

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (options.replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  listeners.forEach((l) => l())
}

/** 페이지를 떠나기 전에 확인할 것(미저장 변경 등). false를 돌려주면 이동을 막는다. */
let leaveGuard: (() => boolean) | null = null
export function setLeaveGuard(guard: (() => boolean) | null): void {
  leaveGuard = guard
}

export function useLocation(): { path: string; search: URLSearchParams } {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    window.addEventListener('popstate', l)
    return () => {
      listeners.delete(l)
      window.removeEventListener('popstate', l)
    }
  }, [])
  return { path: location.pathname, search: new URLSearchParams(location.search) }
}

export function match(pattern: string, path: string): Record<string, string> | null {
  const names: string[] = []
  const re = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, n: string) => {
    names.push(n)
    return '([^/]+)'
  }) + '/?$')
  const m = path.match(re)
  if (!m) return null
  const params: Record<string, string> = {}
  names.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])))
  return params
}

export function Link({ to, children, onClick, ...rest }: { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (rest.target === '_blank') return
    e.preventDefault()
    if (leaveGuard && !leaveGuard()) return
    navigate(to)
    window.scrollTo(0, 0)
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
