import { api } from './api'

// 디스코드 웹훅 알림 (spec 078). 회원이 자기 채널의 웹훅 주소를 넣는다. 서버는 토큰을 돌려주지 않는다.

export interface DiscordStatus {
  available: boolean
  linked: boolean
  /** 디스코드에서 정한 웹훅 이름. 어느 채널로 가는지 알아보는 용도 */
  webhookName: string | null
  notifications: boolean
  linkedAt: string | null
}

const WEBHOOK_URL = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api(?:\/v\d{1,2})?\/webhooks\/\d{15,25}\/[A-Za-z0-9_-]{20,128}\/?$/

/** 서버와 같은 꼴인지 미리 본다. 틀리면 보내기 전에 알려 준다 */
export function isDiscordWebhookUrl(url: string): boolean {
  return WEBHOOK_URL.test(url.trim())
}

export const discordApi = {
  status: () => api<DiscordStatus>('/api/me/discord'),
  connect: (url: string) => api<DiscordStatus>('/api/me/discord', { method: 'PUT', body: { url: url.trim() } }),
  test: () => api<DiscordStatus>('/api/me/discord/test', { method: 'POST' }),
  setNotifications: (notifications: boolean) =>
    api<DiscordStatus>('/api/me/discord', { method: 'PATCH', body: { notifications } }),
  unlink: () => api<void>('/api/me/discord', { method: 'DELETE' }),
}
