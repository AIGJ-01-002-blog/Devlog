import { api } from './api'

// 글 수정 이력 (055). 발행할 때마다 한 판씩 남고, 작성자만 본다.

export interface RevisionItem {
  no: number
  title: string
  createdAt: string
  length: number
}

export interface Revision {
  no: number
  title: string
  contentMd: string
  summary: string | null
  createdAt: string
}

export const revisions = {
  list: (postId: number) => api<RevisionItem[]>(`/api/posts/${postId}/revisions`),
  get: (postId: number, no: number) => api<Revision>(`/api/posts/${postId}/revisions/${no}`),
}

/** 목록 한 줄 이름: 맨 위(가장 최근)는 "지금 발행본", 맨 처음 판은 "첫 발행". */
export function revisionLabel(item: RevisionItem, latestNo: number): string {
  if (item.no === latestNo) return `${item.no}판 · 지금 발행본`
  if (item.no === 1) return '1판 · 첫 발행'
  return `${item.no}판`
}
