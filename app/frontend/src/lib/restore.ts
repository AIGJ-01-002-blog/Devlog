import type { LocalDraft } from './localDrafts'

/**
 * 에디터를 열 때 이 기기 내용과 서버 내용을 비교한다 (006 FR-008).
 * - none: 기기 데이터 없음
 * - discard: 미전송 내용이 없거나 서버와 같다(떠날 때 보낸 마지막 저장이 성공한 경우 등) → 기기 데이터를 지운다
 * - load: 미전송 내용이 서버의 지금 버전에서 출발했다 → 충돌이 아니므로 불러와 이어서 동기화한다
 * - conflict: 그 사이 다른 곳에서 서버 내용이 바뀌었다 → 바로 비교 창
 */
export type RestoreDecision = 'none' | 'discard' | 'load' | 'conflict'

export function decideRestore(server: { title: string; contentMd: string; version: number }, local: LocalDraft | null): RestoreDecision {
  if (!local) return 'none'
  if (!local.unsynced) return 'discard'
  if (local.title === server.title && local.contentMd === server.contentMd) return 'discard'
  return local.baseVersion === server.version ? 'load' : 'conflict'
}
