import { api } from './api'
import type { ReportReason } from './moderation'

// 관리자 페이지 (spec 062): 대시보드 통계, 회원·글 관리, 권한. 관리자(ADMIN)는 운영자 계정 하나, 매니저(MANAGER)는 권한을 주지 못한다.

export type Role = 'USER' | 'MANAGER' | 'ADMIN'
export type Period = 7 | 30 | 90

export const PERIODS: Period[] = [7, 30, 90]

export const ROLE_LABEL: Record<Role, string> = { USER: '일반 회원', MANAGER: '매니저', ADMIN: '관리자' }

export const MEMBER_STATUS_LABEL: Record<string, string> = { ACTIVE: '활동 중', SUSPENDED: '정지', WITHDRAWN: '탈퇴 신청' }

export const PROVIDER_LABEL: Record<string, string> = { GITHUB: 'GitHub', GOOGLE: 'Google', LOCAL: '이메일' }

/** 관리자 페이지를 쓸 수 있는 권한인가 (매니저 포함) */
export function isStaff(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'MANAGER'
}

export function roleLabel(role: string | null | undefined): string {
  return ROLE_LABEL[role as Role] ?? '일반 회원'
}

export interface MemberSummary { total: number; active: number; suspended: number; withdrawing: number; managers: number; admins: number }
export interface PostSummary { published: number; publicPosts: number; privatePosts: number; drafts: number; trash: number; hidden: number }
export interface Sums { signups: number; posts: number; comments: number; likes: number; views: number; reports: number }
export interface Day extends Sums { date: string }

export interface PostLine {
  id: number
  /** 비공개·친구 공개 글은 관리자에게도 제목을 주지 않는다 */
  title: string | null
  authorHandle: string
  visibility: string
  hidden: boolean
  views: number
  likes: number
  comments: number
  link: string
}

export interface Dashboard {
  days: Period
  from: string
  to: string
  totals: { members: MemberSummary; posts: PostSummary; comments: number; likes: number; views: number; pendingReports: number; openInquiries: number }
  current: Sums
  previous: Sums
  activeMembers: number
  daily: Day[]
  topPosts: PostLine[]
  topAuthors: { handle: string; nickname: string | null; posts: number }[]
}

export interface MemberRow {
  id: number
  handle: string
  nickname: string | null
  role: Role
  status: string
  provider: string | null
  joinedAt: string
  lastActiveAt: string | null
}

export interface MemberLine { member: MemberRow; posts: number; drafts: number; hiddenPosts: number; comments: number }

export interface Paged<T> { items: T[]; page: number; total: number; pageSize: number }

export interface MemberDetail {
  member: MemberRow
  posts: { published: number; publicPosts: number; drafts: number; hidden: number }
  comments: number
  viewsReceived: number
  likesReceived: number
  commentsReceived: number
  monthly: { month: string; posts: number }[]
  topPosts: PostLine[]
}

export type PostFilter = 'all' | 'public' | 'private' | 'hidden'

export const POST_FILTERS: { code: PostFilter; label: string }[] = [
  { code: 'all', label: '전체' },
  { code: 'public', label: '공개' },
  { code: 'private', label: '비공개' },
  { code: 'hidden', label: '숨김' },
]

function query(params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const consoleApi = {
  dashboard: (days: Period) => api<Dashboard>(`/api/admin/dashboard${query({ days })}`),
  members: (q: string, role: string, status: string, page: number) =>
    api<Paged<MemberLine>>(`/api/admin/members${query({ q, role, status, page })}`),
  memberStats: (handle: string) => api<MemberDetail>(`/api/admin/members/${encodeURIComponent(handle)}/stats`),
  setRole: (handle: string, role: Role) =>
    api<{ handle: string; role: Role }>(`/api/admin/members/${encodeURIComponent(handle)}/role`, { method: 'PUT', body: { role } }),
  posts: (q: string, filter: PostFilter, author: string, page: number) =>
    api<Paged<PostLine>>(`/api/admin/posts${query({ q, filter: filter === 'all' ? null : filter, author, page })}`),
  hidePost: (id: number, reason: ReportReason) => api<void>(`/api/admin/posts/${id}/hide`, { method: 'POST', body: { reason } }),
  unhidePost: (id: number) => api<void>(`/api/admin/posts/${id}/unhide`, { method: 'POST' }),
}

/** 이전 기간 대비: "+12%", "-3%", 이전이 0이면 "새로" , 둘 다 0이면 "" */
export function change(current: number, previous: number): { text: string; trend: 'up' | 'down' | 'flat' } {
  if (current === previous) return { text: current === 0 ? '' : '변화 없음', trend: 'flat' }
  if (previous === 0) return { text: '새로 생김', trend: 'up' }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { text: '변화 없음', trend: 'flat' }
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, trend: pct > 0 ? 'up' : 'down' }
}

/** 1,234 처럼 세 자리마다 쉼표 */
export function count(n: number): string {
  return n.toLocaleString('ko-KR')
}

/** 쪽 수 */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
