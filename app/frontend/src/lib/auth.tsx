// 로그인 상태. 서버 세션이 원본이고 화면은 /api/auth/me로 읽기만 한다.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { Me } from './types'

interface AuthState {
  me: Me | null
  loading: boolean
  refresh: () => Promise<Me | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  me: null,
  loading: true,
  refresh: async () => null,
  logout: async () => undefined,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const m = await api<Me>('/api/auth/me')
      setMe(m)
      return m
    } catch {
      setMe(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    const id = me?.member?.id
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } finally {
      // 공용 PC 대비: 이 브라우저에 남은 본인의 작성 데이터를 지운다 (docs/04 §2-2)
      if (id != null) {
        for (const store of [localStorage, sessionStorage]) {
          Object.keys(store).filter((k) => k.includes(`:${id}:`)).forEach((k) => store.removeItem(k))
        }
      }
      sessionStorage.clear()
      await refresh()
    }
  }, [me, refresh])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return <AuthContext.Provider value={{ me, loading, refresh, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

/** 로그인 화면으로 보내며 돌아올 주소를 남긴다. */
export function loginPath(redirect: string = location.pathname + location.search): string {
  return `/login?redirect=${encodeURIComponent(redirect)}`
}
