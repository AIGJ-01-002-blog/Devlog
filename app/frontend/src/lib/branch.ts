import { useEffect, useState } from 'react'
import { api } from './api'
import { seriesApi, seriesPath, type SeriesNav } from './series'
import type { Branch, Card } from './types'

// 글 화면의 브랜치 (spec 072 2단계): 시리즈 또는 주제 브랜치, 비슷한 글, 이 기기에서 읽은 글

export interface BranchItem {
  id: number
  title: string
  url: string
}

/** 글 화면 브랜치 상자. index는 1부터, 지금 글이 목록에 없으면(주인이 보는 임시글) null */
export interface BranchNav {
  kind: Branch['kind']
  key: string
  name: string
  url: string
  index: number | null
  posts: BranchItem[]
}

interface TopicNav {
  key: string
  name: string
  url: string
  index: number
  posts: BranchItem[]
}

export interface Suggestion {
  kind: Branch['kind']
  key: string
  seriesId: number | null
  name: string
  url: string | null
  /** 함께 쓴 태그 */
  shared: string[]
}

export interface SuggestResult {
  current: Suggestion | null
  series: Suggestion | null
  topic: Suggestion | null
  optedOut: boolean
}

export const topicApi = {
  /** 주제 브랜치에 없으면 204라 null */
  ofPost: (postId: number) => api<TopicNav | undefined>(`/api/posts/${postId}/topic`).then((n) => n ?? null),
  similar: (postId: number) => api<Card[]>(`/api/posts/${postId}/similar`),
  suggest: (postId: number, tags: string[]) => api<SuggestResult>(`/api/posts/${postId}/branch-suggestion`, { method: 'POST', body: { tags } }),
  optOut: (postId: number, optOut: boolean) => api<void>(`/api/posts/${postId}/topic-optout`, { method: 'PUT', body: { optOut } }),
}

export function fromSeries(n: SeriesNav): BranchNav {
  return { kind: 'SERIES', key: `s${n.id}`, name: n.name, url: seriesPath(n.handle, n.slug), index: n.index, posts: n.posts }
}

/** 글이 든 브랜치. 시리즈가 먼저이고, 없으면 주제 브랜치. 둘 다 없으면 null, 읽는 중이면 undefined */
export function usePostBranch(postId: number): BranchNav | null | undefined {
  const [nav, setNav] = useState<{ id: number; nav: BranchNav | null } | null>(null)
  useEffect(() => {
    let alive = true
    seriesApi.ofPost(postId)
      .then((s) => s && s.posts.length > 0 ? fromSeries(s) : topicApi.ofPost(postId).then((t) => t && { kind: 'TOPIC' as const, ...t }))
      .catch(() => null)
      .then((n) => { if (alive) setNav({ id: postId, nav: n ?? null }) })
    return () => { alive = false }
  }, [postId])
  return nav?.id === postId ? nav.nav : undefined
}

/** 이전·다음 글. 지금 글이 목록에 없으면 둘 다 없다 */
export function branchNeighbors(nav: BranchNav): { prev: BranchItem | null; next: BranchItem | null } {
  if (nav.index == null) return { prev: null, next: null }
  return { prev: nav.posts[nav.index - 2] ?? null, next: nav.posts[nav.index] ?? null }
}

const READ_KEY = 'devlog:read-posts'
/** 기억하는 읽은 글 수. 넘치면 오래된 것부터 잊는다 */
export const READ_KEEP = 1000

/** 이 기기에서 연 글 번호 (시리즈 이어 읽기). 서버에 남기지 않는다. 저장소를 못 쓰면 빈 목록 */
export function readPosts(): Set<number> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(list) ? list.filter((n): n is number => typeof n === 'number') : [])
  } catch {
    return new Set()
  }
}

export function markRead(postId: number): void {
  try {
    const list = [...readPosts()].filter((n) => n !== postId)
    list.push(postId)
    localStorage.setItem(READ_KEY, JSON.stringify(list.slice(-READ_KEEP)))
  } catch {
    // 저장 공간이 없거나 막혀 있으면 기억하지 않는다
  }
}

/** 시리즈 읽은 정도: 읽은 편 수와 이어 읽을 글(읽지 않은 첫 글, 다 읽었으면 null) */
export function seriesProgress<T extends { id: number }>(posts: T[], read: Set<number>): { done: number; next: T | null } {
  const done = posts.filter((p) => read.has(p.id)).length
  return { done, next: posts.find((p) => !read.has(p.id)) ?? null }
}
