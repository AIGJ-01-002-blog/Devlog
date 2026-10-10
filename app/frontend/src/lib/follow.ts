import { api } from './api'
import type { Card } from './types'
import { t } from './i18n'

// 팔로우·피드 (spec 016). 팔로우는 상태 지정(PUT·DELETE)이라 여러 번 보내도 결과가 같다.

export interface FollowState {
  following: boolean
  followerCount: number
}

export interface FollowPerson {
  id: number
  handle: string
  nickname: string
  bioFirstLine: string | null
  profileImageUrl: string | null
  /** 보는 사람이 팔로우 중인지 */
  following: boolean
  /** 보는 사람 본인 (버튼 없음) */
  me: boolean
}

export interface FollowPage {
  items: FollowPerson[]
  nextCursor: string | null
  /** 주인이 목록을 비공개로 둬서 보이지 않는다 (spec 079). 본인·관리자에게는 늘 false */
  hidden?: boolean
}

export interface FollowFeedPage {
  items: Card[]
  nextCursor: string | null
  /** 첫 쪽에서만 온다. 빈 피드 문구를 고른다 */
  followsAnyone?: boolean | null
}

export type FollowDirection = 'followers' | 'following'

const member = (handle: string) => `/api/members/${encodeURIComponent(handle)}`

export const followApi = {
  set: (handle: string, on: boolean) => api<FollowState>(`${member(handle)}/follow`, { method: on ? 'PUT' : 'DELETE' }),
  list: (handle: string, direction: FollowDirection, cursor: string | null) =>
    api<FollowPage>(`${member(handle)}/${direction}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
}

export const FEED_ENDPOINT = '/api/feed'

/** 버튼 글자 (FR-008): 팔로우 안 함 [팔로우], 팔로우 중 [팔로잉 ✓], 그 위에 마우스·초점이면 [언팔로우]. */
export function followLabel(following: boolean, hover: boolean): string {
  if (!following) return t('팔로우')
  return hover ? t('언팔로우') : t('팔로잉 ✓')
}

export const FOLLOW_ERROR = t('잠시 후 다시 시도해 주세요')

/** 비공개로 둔 목록을 다른 사람이 열었을 때 (spec 079) */
export const HIDDEN_FOLLOW_TEXT = t('비공개 계정입니다')

export function emptyFollowText(direction: FollowDirection): string {
  return direction === 'followers' ? t('아직 팔로워가 없어요') : t('아직 팔로우한 사람이 없어요')
}

/** 목록 이어 붙이기: 사이에 팔로우가 바뀌어 경계가 밀려도 같은 사람을 두 번 보이지 않는다. */
export function appendPeople(prev: FollowPerson[], next: FollowPerson[]): FollowPerson[] {
  const seen = new Set(prev.map((p) => p.id))
  return [...prev, ...next.filter((p) => !seen.has(p.id))]
}
