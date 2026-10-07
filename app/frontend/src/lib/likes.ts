import { api } from './api'

export interface LikeState { liked: boolean; likeCount: number }

export const likesApi = {
  set: (postId: number, liked: boolean) =>
    api<LikeState>(`/api/posts/${postId}/like`, { method: liked ? 'PUT' : 'DELETE' }),
}

/**
 * 좋아요 즉시 반영 + 연타 묶기 (docs/30 §5, 012 FR-012·FR-013).
 * 누르면 바로 화면 상태를 바꾸고, 마지막 상태만 0.3초 뒤에 보낸다. 서버가 상태 지정 방식이라 순서가 섞여도 결과가 맞다.
 * 성공하면 서버 숫자로 맞추고, 실패하면 마지막으로 확인된 상태로 되돌린다.
 * 보낸 뒤 다시 누른 경우에는 늦게 온 응답으로 화면을 덮지 않고, 앞 요청이 끝난 뒤 마지막 상태를 다시 판단한다.
 */
export function createLikeSync(opts: {
  initial: LikeState
  send: (liked: boolean) => Promise<LikeState>
  onChange: (s: LikeState) => void
  onError: () => void
  delayMs?: number
}) {
  let confirmed = opts.initial
  let shown = opts.initial
  let timer: ReturnType<typeof setTimeout> | null = null
  let presses = 0 // 누른 횟수. 응답이 왔을 때 그 뒤로 누른 적이 있으면 화면은 사용자 것이 우선이다
  let inflight: Promise<unknown> | null = null
  const show = (s: LikeState) => { shown = s; opts.onChange(s) }

  const flush = async () => {
    timer = null
    if (inflight) await inflight.catch(() => undefined)
    if (timer !== null || inflight) return // 기다리는 사이 다시 눌렀거나 다른 전송이 시작됨
    const target = shown.liked
    const at = presses
    if (target === confirmed.liked) {
      show({ ...confirmed }) // 눌렀다 되돌렸으면 보낼 것이 없다. 숫자는 확인된 값으로
      return
    }
    const request = opts.send(target)
    inflight = request
    try {
      confirmed = await request
      if (at === presses) show(confirmed)
    } catch {
      if (at === presses) {
        show(confirmed)
        opts.onError()
      }
    } finally {
      inflight = null
    }
  }

  return {
    toggle() {
      presses++
      const liked = !shown.liked
      show({ liked, likeCount: Math.max(0, shown.likeCount + (liked ? 1 : -1)) })
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void flush() }, opts.delayMs ?? 300)
    },
    dispose() { if (timer) clearTimeout(timer) },
    get state() { return shown },
  }
}
