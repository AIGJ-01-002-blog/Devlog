import { api } from './api'
import type { Card, CardAuthor } from './types'

// 검색 (spec 014, docs/33). 검색어 규칙은 서버 SearchTerms가 정하고 화면은 안내만 한다.

export type SearchTab = 'posts' | 'people'
export type SearchSort = 'relevance' | 'latest'
export type SearchNotice = 'TWO_CHAR_TITLE_TAG_ONLY' | 'TOO_SHORT' | null

/** 글 결과: 목록 카드와 같은 모양에 미리보기 자리만 검색어 주변 문장(snippetHtml, mark 외 태그 없음)이다. */
export interface SearchHit extends Omit<Card, 'excerpt' | 'publishedAt' | 'visibility' | 'firstPublicAt'> {
  firstPublicAt: string
  snippetHtml: string | null
}

export interface SearchPostPage {
  query: string
  items: SearchHit[]
  nextCursor: string | null
  notice: SearchNotice
}

export interface Person {
  id: number
  handle: string
  nickname: string
  bioFirstLine: string | null
  profileImageUrl: string | null
}

export interface PeoplePage {
  query: string
  items: Person[]
  notice: SearchNotice
}

export const SEARCH_MAX_LENGTH = 50

export const NOTICE_TEXT: Record<Exclude<SearchNotice, null>, string> = {
  TWO_CHAR_TITLE_TAG_ONLY: '두 글자 단어는 제목·태그에서만 찾았어요',
  TOO_SHORT: '두 글자 이상 입력해 주세요',
}

export function searchPath(q: string, tab: SearchTab = 'posts', sort: SearchSort = 'relevance'): string {
  const params = new URLSearchParams({ q: q.trim() })
  if (tab !== 'posts') params.set('tab', tab)
  if (sort !== 'relevance') params.set('sort', sort)
  return `/search?${params.toString().replace(/\+/g, '%20')}`
}

export function postsEndpoint(q: string, sort: SearchSort, blog?: string): string {
  const params = new URLSearchParams({ q })
  if (sort === 'latest') params.set('sort', 'latest')
  if (blog) params.set('blog', blog)
  return `/api/search/posts?${params.toString().replace(/\+/g, '%20')}`
}

export function emptyMessage(q: string): string {
  return `'${q}'에 대한 글이 없어요`
}

/** 검색어에 2글자 단어가 있는지 (안내를 미리 보이려고). 1글자는 무시되므로 세지 않는다. */
export function hasShortWord(q: string): boolean {
  return q.normalize('NFC').trim().split(/\s+/).some((w) => [...w].length === 2)
}

export function parseSort(raw: string | null): SearchSort {
  return raw === 'latest' ? 'latest' : 'relevance'
}

export const searchApi = {
  people: (q: string) => api<PeoplePage>(`/api/search/people?q=${encodeURIComponent(q)}`),
}

export type SearchAuthor = CardAuthor
