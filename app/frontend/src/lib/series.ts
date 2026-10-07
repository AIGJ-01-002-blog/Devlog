import { api } from './api'
import type { Card } from './types'

// 시리즈 (spec 024). 보이는 글·개수·순서는 서버가 보는 사람 기준으로 정해서 준다.

export interface SeriesSummary {
  id: number
  name: string
  slug: string
  postCount: number
  thumbnailUrl: string | null
  updatedAt: string
}

export interface SeriesDetail {
  id: number
  name: string
  slug: string
  updatedAt: string
  mine: boolean
  posts: Card[]
}

export interface SeriesItem {
  id: number
  title: string
  url: string
}

/** 글 상세의 시리즈 상자. index는 1부터, 지금 글이 목록에 없으면(임시글) null */
export interface SeriesNav {
  id: number
  name: string
  slug: string
  handle: string
  index: number | null
  posts: SeriesItem[]
}

/** 글쓰기 화면의 내 시리즈 목록 */
export interface MySeries {
  id: number
  name: string
  slug: string
  postCount: number
}

export const SERIES_NAME_MAX = 50

const member = (handle: string) => `/api/members/${encodeURIComponent(handle)}`

export const seriesApi = {
  list: (handle: string) => api<SeriesSummary[]>(`${member(handle)}/series`),
  detail: (handle: string, slug: string) => api<SeriesDetail>(`${member(handle)}/series/${encodeURIComponent(slug)}`),
  /** 시리즈에 없으면 204라 null */
  ofPost: (postId: number) => api<SeriesNav | undefined>(`/api/posts/${postId}/series`).then((n) => n ?? null),
  assign: (postId: number, seriesId: number | null) => api<void>(`/api/posts/${postId}/series`, { method: 'PUT', body: { seriesId } }),
  mine: () => api<MySeries[]>('/api/me/series'),
  create: (name: string) => api<MySeries>('/api/me/series', { method: 'POST', body: { name } }),
  rename: (id: number, name: string) => api<MySeries>(`/api/me/series/${id}`, { method: 'PATCH', body: { name } }),
  remove: (id: number) => api<void>(`/api/me/series/${id}`, { method: 'DELETE' }),
  reorder: (id: number, postIds: number[]) => api<void>(`/api/me/series/${id}/posts`, { method: 'PUT', body: { postIds } }),
}

export const seriesPath = (handle: string, slug: string) => `/@${handle}/series/${encodeURIComponent(slug)}`

/** 서버와 같은 규칙의 이름 검사 (FR-001): 앞뒤 공백을 빼고 1~50자, 글자나 숫자가 하나는 있어야 주소를 만든다. */
export function seriesNameError(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!name) return '시리즈 이름을 써 주세요.'
  if ([...name].length > SERIES_NAME_MAX) return `${SERIES_NAME_MAX}자 안으로 써 주세요.`
  if (!/[\p{L}\p{N}]/u.test(name)) return '글자나 숫자를 넣어 주세요.'
  return null
}

/** 이전·다음 글. 지금 글이 목록에 없으면 둘 다 없다. */
export function neighbors(nav: SeriesNav): { prev: SeriesItem | null; next: SeriesItem | null } {
  if (nav.index == null) return { prev: null, next: null }
  return { prev: nav.posts[nav.index - 2] ?? null, next: nav.posts[nav.index] ?? null }
}
