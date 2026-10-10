import { useEffect, type RefObject } from 'react'
import { api } from './api'
import { t } from './i18n'

/** 글이 화면에 이만큼 연속으로 보이면 한 번 본 것으로 친다 (spec 013 FR-001). */
export const VIEW_DWELL_MS = 1000

export const VIEW_HINT = t('같은 사람은 하루에 한 번만 세요')

/**
 * 탭이 보이고 글이 화면 안에 있는 동안만 시간을 잰다. 다시 가려지면 처음부터 잰다.
 * 한 번 보내면 끝이고, 실패해도 다시 보내지 않는다(조회수는 정확하지 않아도 되고 읽기를 방해하면 안 된다).
 * @returns 정리 함수
 */
export function watchView(el: Element, send: () => void, win: Window = window): () => void {
  let inView = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let done = false
  const doc = win.document

  const update = () => {
    const ready = inView && doc.visibilityState === 'visible' && !done
    if (ready && timer === null) {
      timer = setTimeout(() => {
        done = true
        cleanup()
        send()
      }, VIEW_DWELL_MS)
    } else if (!ready && timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
  const observer = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting)
    update()
  })
  observer.observe(el)
  doc.addEventListener('visibilitychange', update)

  function cleanup() {
    observer.disconnect()
    doc.removeEventListener('visibilitychange', update)
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
  return cleanup
}

export function sendView(postId: number): void {
  api(`/api/posts/${postId}/views`, { method: 'POST', keepalive: true }).catch(() => {})
}

let lastPath: string | null = null
let lastDay: string | null = null

/** 한국 날짜(서버가 하루를 나누는 기준) */
function kstDay(now = Date.now()): string {
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10)
}

/** 다른 사이트에서 왔을 때만 이전 주소를 보낸다. 같은 사이트 주소는 서버가 직접 들어온 것으로 본다 */
function externalReferrer(doc: Document = document): string | undefined {
  const ref = doc.referrer
  if (!ref) return undefined
  try {
    return new URL(ref).origin === location.origin ? undefined : ref
  } catch {
    return undefined
  }
}

/**
 * 화면을 열 때마다 보낸다 (spec 064·070). 처음 한 번은 방문(first)으로, 이전 주소와 함께 보내 유입 경로를 센다.
 * 그 뒤 블로그 안에서 화면을 옮기면 많이 본 화면 순위에만 센다(자정이 지나면 다시 처음처럼). 같은 화면을 잇달아 보내지 않고, 실패해도 다시 보내지 않는다.
 */
export function sendPage(path: string): void {
  if (path === lastPath) return
  const day = kstDay()
  // 화면을 연 채 자정이 지나면 그날 방문으로 다시 들어온다. 서버는 그날 방문이 있는 사람의 화면 이동만 센다
  const first = lastPath === null || day !== lastDay
  lastPath = path
  lastDay = day
  const body = first ? { first, path, referrer: externalReferrer() } : { first, path }
  api('/api/visits', { method: 'POST', body, keepalive: true }).catch(() => {})
}

/** 남의 발행 글을 열었을 때만 센다. 작성자 본인은 서버도 세지 않지만 요청부터 보내지 않는다. */
export function useViewBeacon(ref: RefObject<Element | null>, postId: number | undefined, enabled: boolean): void {
  useEffect(() => {
    const el = ref.current
    if (!enabled || postId === undefined || !el || typeof IntersectionObserver === 'undefined') return
    return watchView(el, () => sendView(postId))
  }, [ref, postId, enabled])
}
