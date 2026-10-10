import { api, ApiError } from './api'
import { t } from './i18n'

// 문의·신고 (spec 054). 종류·상태 코드는 서버 InquiryCategory·InquiryStatus와 같다.

export type InquiryCategory = 'QUESTION' | 'BUG' | 'SUGGESTION' | 'REPORT'
export type InquiryStatus = 'RECEIVED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export interface Inquiry {
  id: number
  category: InquiryCategory
  /** WEB 화면에서, MCP 연결한 AI가 report_bug로 */
  source: 'WEB' | 'MCP'
  title: string
  content: string
  pageUrl: string | null
  toolName: string | null
  /** 관리자 화면에만: AI 앱 또는 토큰 이름 */
  clientName: string | null
  appVersion: string | null
  status: InquiryStatus
  answer: string | null
  answeredAt: string | null
  fixedVersion: string | null
  createdAt: string
  updatedAt: string
  /** 관리자 화면에만 */
  memberHandle: string | null
  memberNickname: string | null
}

export const TITLE_MAX = 200
export const CONTENT_MAX = 20_000
export const ANSWER_MAX = 5_000

export const CATEGORIES: { code: InquiryCategory; label: string; hint: string }[] = [
  { code: 'QUESTION', label: t('문의'), hint: t('쓰는 방법이나 계정에 대해 궁금한 점') },
  { code: 'BUG', label: t('버그·오류'), hint: t('화면이나 AI 연결이 잘못 동작할 때') },
  { code: 'SUGGESTION', label: t('제안'), hint: t('있으면 좋을 기능이나 바꾸면 좋을 점') },
  { code: 'REPORT', label: t('신고'), hint: t('사람이나 운영에 관한 신고 (글·댓글은 그 화면의 [신고])') },
]

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  RECEIVED: t('접수'),
  IN_PROGRESS: t('처리 중'),
  RESOLVED: t('해결'),
  CLOSED: t('닫힘'),
}

export const STATUS_HINT: Record<InquiryStatus, string> = {
  RECEIVED: t('운영자가 아직 읽지 않았어요'),
  IN_PROGRESS: t('운영자가 살펴보고 있어요'),
  RESOLVED: t('고쳤거나 해결했어요'),
  CLOSED: t('답변을 마쳤어요'),
}

export function categoryLabel(code: InquiryCategory): string {
  return CATEGORIES.find((c) => c.code === code)?.label ?? t('문의')
}

/** 버그 본문 틀: AI 신고(report_bug)와 같은 순서라 운영자가 한 가지 모양으로 읽는다 */
export const BUG_TEMPLATE = t('## 무슨 일이 있었나요\n\n## 어떻게 하면 다시 일어나나요\n1. \n\n## 기대한 결과\n\n## 실제 결과\n')

/** 접수 때 남길 화면 주소: 사이트 안 경로만. 문의 화면 자체는 남기지 않는다 */
export function reportedPage(from: string | null): string | null {
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/support')) return null
  return from.slice(0, 500)
}

/** 고친 버전 → 릴리스 노트의 그 버전 자리 */
export function releaseLink(version: string): string {
  return `/releases#v${version}`
}

export const inquiryApi = {
  submit: (category: InquiryCategory, title: string, content: string, pageUrl: string | null) =>
    api<{ id: number }>('/api/inquiries', { method: 'POST', body: { category, title, content, pageUrl } }),
  mine: () => api<{ items: Inquiry[] }>('/api/me/inquiries').then((r) => r.items),
}

export const adminInquiryApi = {
  list: (tab: 'open' | 'done', category: InquiryCategory | null, before: number | null) => {
    const q = new URLSearchParams({ tab })
    if (category) q.set('category', category)
    if (before != null) q.set('before', String(before))
    return api<{ items: Inquiry[]; nextBefore: number | null }>(`/api/admin/inquiries?${q}`)
  },
  detail: (id: number) => api<Inquiry>(`/api/admin/inquiries/${id}`),
  update: (id: number, body: { status?: InquiryStatus; answer?: string; fixedVersion?: string }) =>
    api<Inquiry>(`/api/admin/inquiries/${id}`, { method: 'PATCH', body }),
}

export function inquiryErrorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'TOO_MANY_REQUESTS') return t('문의가 너무 많아요. 잠시 후 다시 보내 주세요.')
    if (e.code === 'ACCOUNT_SUSPENDED') return t('정지된 계정은 문의를 남길 수 없어요.')
    if (e.code === 'VALIDATION_FAILED') return e.errors[0]?.message ?? t('입력을 확인해 주세요.')
  }
  return t('보내지 못했어요. 잠시 후 다시 시도해 주세요.')
}
