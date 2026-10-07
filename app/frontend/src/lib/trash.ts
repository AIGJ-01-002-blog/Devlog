import { api } from './api'
import { localDrafts } from './localDrafts'

// 글 삭제·휴지통 (007). 삭제는 휴지통으로 옮기고 30일 뒤 완전히 지워진다.

export type TrashOutcome = 'TRASHED' | 'ALREADY_TRASHED' | 'DELETED_EMPTY'

export interface TrashResult {
  result: TrashOutcome
  deletedAt: string | null
  purgeAt: string | null
}

export const TRASH_CONFIRM = '휴지통으로 옮길까요? 30일 안에는 복구할 수 있어요.'
export const PURGE_CONFIRM = '완전히 삭제할까요? 댓글·좋아요도 함께 지워지고 되돌릴 수 없어요.'

/** 휴지통으로 옮긴다. 이 기기에 남은 작성 데이터도 지워 다시 열었을 때 되살아나지 않게 한다. */
export async function trashPost(id: number, memberId?: number): Promise<TrashResult> {
  const r = await api<TrashResult>(`/api/posts/${id}`, { method: 'DELETE' })
  if (memberId != null) await localDrafts.remove(memberId, id)
  return r
}

export function restorePost(id: number): Promise<{ status: 'DRAFT' | 'PUBLISHED'; visibility: string | null }> {
  return api(`/api/posts/${id}/restore`, { method: 'POST' })
}

export function purgePost(id: number): Promise<unknown> {
  return api(`/api/posts/${id}/permanent`, { method: 'DELETE' })
}

/** 완전 삭제까지 남은 날 (올림, 최소 0). "D-3"처럼 보여 준다. */
export function daysLeft(purgeAt: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - now) / 86_400_000))
}

export function trashedMessage(r: TrashResult): string {
  return r.result === 'DELETED_EMPTY' ? '빈 임시글이라 바로 지웠어요.' : '휴지통으로 옮겼어요. 30일 안에 복구할 수 있어요.'
}
