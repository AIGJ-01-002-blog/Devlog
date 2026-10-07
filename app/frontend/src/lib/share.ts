/** 글 공유 (spec 039). 손가락으로 쓰는 기기는 기기의 공유 창을, 그 밖에는 링크 복사를 쓴다. */
export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export interface ShareEnv {
  share?: (data: { title: string; url: string }) => Promise<void>
  writeText?: (text: string) => Promise<void>
  /** 터치 위주 기기인지. 데스크톱 브라우저에도 공유 창이 있지만, 거기서는 링크 복사를 기대한다 */
  touch: boolean
}

export function browserShareEnv(): ShareEnv {
  const nav = typeof navigator === 'undefined' ? undefined : navigator
  return {
    share: nav?.share ? (d) => nav.share(d) : undefined,
    writeText: nav?.clipboard?.writeText ? (t) => nav.clipboard.writeText(t) : undefined,
    touch: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
  }
}

/** 사이트 안 경로를 남에게 보낼 수 있는 전체 주소로 바꾼다 */
export function absoluteUrl(path: string, origin: string): string {
  return new URL(path, origin).href
}

export async function shareLink(url: string, title: string, env: ShareEnv): Promise<ShareResult> {
  if (env.touch && env.share) {
    try {
      await env.share({ title, url })
      return 'shared'
    } catch (e) {
      // 사용자가 공유 창을 닫았다. 복사로 넘어가지 않는다
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  if (!env.writeText) return 'failed'
  try {
    await env.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
