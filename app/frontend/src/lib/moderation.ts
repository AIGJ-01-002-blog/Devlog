import { api, ApiError } from './api'

// 신고·숨김·정지 (spec 019, docs/43). 사유 코드는 서버 ReportReason과 같다.

export type ReportReason = 'SPAM' | 'ABUSE' | 'SEXUAL' | 'PRIVACY' | 'COPYRIGHT' | 'OTHER'
export type ReportTarget = 'POST' | 'COMMENT'

export const REASONS: { code: ReportReason; label: string }[] = [
  { code: 'SPAM', label: '스팸·광고' },
  { code: 'ABUSE', label: '욕설·혐오' },
  { code: 'SEXUAL', label: '음란·선정' },
  { code: 'PRIVACY', label: '개인정보 노출' },
  { code: 'COPYRIGHT', label: '저작권 침해' },
  { code: 'OTHER', label: '기타' },
]

export const DETAIL_MAX = 200

export function reasonLabel(code: string | null | undefined): string {
  return REASONS.find((r) => r.code === code)?.label ?? '기타'
}

export const reportApi = {
  report: (targetType: ReportTarget, targetId: number, reason: ReportReason, detail: string | null) =>
    api<void>('/api/reports', { method: 'POST', body: { targetType, targetId, reason, detail } }),
}

/** 신고 실패 안내. 성공(같은 대상 재신고 포함)은 같은 문구다. */
export function reportErrorText(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'CANNOT_REPORT_OWN': return '자기 글이나 댓글은 신고할 수 없어요.'
      case 'NOT_FOUND': return '이미 지워졌거나 볼 수 없는 내용이에요.'
      case 'TOO_MANY_REQUESTS': return '신고가 너무 많아요. 잠시 후 다시 시도해 주세요.'
      case 'EMAIL_NOT_VERIFIED': return '이메일 인증 후 신고할 수 있어요.'
      case 'VALIDATION_FAILED': return e.errors[0]?.message ?? '입력을 확인해 주세요.'
    }
  }
  return '신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요.'
}

// --- 관리자 ---

export type CaseStatus = 'PENDING' | 'HIDDEN' | 'REJECTED' | 'CLOSED_NO_TARGET'
export type TargetState = 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'DRAFT' | 'TRASH' | 'HIDDEN' | 'DELETED_COMMENT' | 'AUTHOR_WITHDRAWN' | 'GONE'

export interface CaseRow {
  caseId: number
  targetType: ReportTarget
  status: CaseStatus
  preview: string | null
  authorHandle: string
  reportCount: number
  reasons: Partial<Record<ReportReason, number>>
  latestAt: string
  handledAt: string | null
  hiddenNow: boolean
}

export interface Suspension { id: number; reason: string; startedAt: string; endsAt: string | null; liftedAt: string | null }

export interface AuthorInfo {
  handle: string
  nickname: string | null
  joinedAt: string
  hiddenCount: number
  suspended: boolean
  /** 관리자·매니저면 정지할 수 없다 (062) */
  admin: boolean
  suspensions: Suspension[]
  /** USER·MANAGER·ADMIN (062) */
  role?: string
}

export interface CaseDetail {
  caseId: number
  targetType: ReportTarget
  targetId: number | null
  status: CaseStatus
  targetState: TargetState
  link: string | null
  snapshotTitle: string | null
  snapshotContent: string | null
  reasons: Partial<Record<ReportReason, number>>
  reports: { reason: ReportReason; detail: string | null; at: string }[]
  hiddenReason: ReportReason | null
  createdAt: string
  handledAt: string | null
  author: AuthorInfo
  mine: boolean
}

export type SuspendDays = 1 | 7 | 30 | null

export const adminApi = {
  list: (tab: 'pending' | 'handled', cursor: string | null) =>
    api<{ items: CaseRow[]; nextCursor: string | null }>(`/api/admin/reports?tab=${tab}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
  detail: (caseId: number) => api<CaseDetail>(`/api/admin/reports/${caseId}`),
  resolve: (caseId: number, action: 'HIDE' | 'REJECT', reason: ReportReason | null, suspend: { days: SuspendDays; reason: string } | null) =>
    api<CaseDetail>(`/api/admin/reports/${caseId}/resolve`, { method: 'POST', body: { action, reason, suspend } }),
  unhide: (caseId: number) => api<CaseDetail>(`/api/admin/reports/${caseId}/unhide`, { method: 'POST' }),
  member: (handle: string) => api<AuthorInfo>(`/api/admin/members/${encodeURIComponent(handle)}`),
  suspend: (handle: string, days: SuspendDays, reason: string) =>
    api<AuthorInfo>(`/api/admin/members/${encodeURIComponent(handle)}/suspension`, { method: 'POST', body: { days, reason } }),
  lift: (handle: string) => api<AuthorInfo>(`/api/admin/members/${encodeURIComponent(handle)}/suspension`, { method: 'DELETE' }),
}

export const STATUS_LABEL: Record<CaseStatus, string> = {
  PENDING: '대기',
  HIDDEN: '숨김',
  REJECTED: '반려',
  CLOSED_NO_TARGET: '대상 없음',
}

export const TARGET_STATE_LABEL: Record<TargetState, string> = {
  PUBLIC: '공개',
  FRIENDS: '친구 공개',
  PRIVATE: '비공개',
  DRAFT: '임시',
  TRASH: '휴지통',
  HIDDEN: '이미 숨김',
  DELETED_COMMENT: '삭제됨',
  AUTHOR_WITHDRAWN: '작성자 탈퇴',
  GONE: '대상 없음',
}

export const SUSPEND_OPTIONS: { days: SuspendDays; label: string }[] = [
  { days: 1, label: '1일' },
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: null, label: '영구' },
]

/** "스팸·광고 3 · 기타 1" */
export function reasonSummary(reasons: Partial<Record<ReportReason, number>>): string {
  return REASONS.filter((r) => reasons[r.code]).map((r) => `${r.label} ${reasons[r.code]}`).join(' · ')
}

/** 정지 기한 안내: 영구면 "영구" */
export function suspensionPeriod(s: Suspension, format: (iso: string) => string): string {
  const end = s.endsAt ? `${format(s.endsAt)}까지` : '영구'
  const lifted = s.liftedAt ? ` · ${format(s.liftedAt)} 해제` : ''
  return `${format(s.startedAt)} ~ ${end}${lifted}`
}
