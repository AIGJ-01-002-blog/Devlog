import { api } from './api'

// 텔레그램 연결 (spec 023). 봇 토큰이 없는 서버면 available=false라 설정 화면에서 숨긴다.

export interface TelegramStatus {
  available: boolean
  botUsername: string | null
  linked: boolean
  notifications: boolean
  linkedAt: string | null
}

export interface TelegramLink {
  url: string
  expiresAt: string
}

/** 연결 주소를 연 뒤 이 간격으로 상태를 다시 읽는다. 주소가 끝나면 멈춘다. */
export const LINK_POLL_MS = 3_000

/** 연결 주소의 남은 시간 문구. 끝났으면 null */
export function linkTimeLeft(expiresAt: string, now: number = Date.now()): string | null {
  const ms = new Date(expiresAt).getTime() - now
  if (!(ms > 0)) return null
  const min = Math.ceil(ms / 60_000)
  return min > 1 ? `${min}분 안에 열어 주세요.` : '1분 안에 열어 주세요.'
}

export const telegramApi = {
  status: () => api<TelegramStatus>('/api/me/telegram'),
  link: () => api<TelegramLink>('/api/me/telegram/link', { method: 'POST' }),
  setNotifications: (notifications: boolean) =>
    api<TelegramStatus>('/api/me/telegram', { method: 'PATCH', body: { notifications } }),
  unlink: () => api<void>('/api/me/telegram', { method: 'DELETE' }),
}
