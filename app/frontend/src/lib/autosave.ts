// 자동 저장 상태 기계 (docs/04 §2-1·§2-2·§2-7). React와 분리해 테스트할 수 있게 한다.
// 규칙: 입력이 3초 멈추면, 계속 입력 중이면 최대 30초마다, 바뀐 경우만 보낸다. 요청은 한 번에 하나.
// 서버가 글마다 5초에 한 번만 받으므로(blog.post.autosave-min-interval) 보낸 뒤 5초 안에는 다시 보내지 않는다.
// 실패하면 2→4→8…최대 60초 간격(무작위 지연)으로 재시도. 409면 보내기를 멈추고 충돌 상태가 된다.
import { ApiError } from './api'
import type { ServerContent } from './types'

export type SaveState =
  | { kind: 'saved'; at: Date | null }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'offline' }
  | { kind: 'conflict'; server: ServerContent }
  | { kind: 'error'; message: string }

export interface Content {
  title: string
  contentMd: string
}

export interface AutosaveOptions {
  idleMs?: number
  maxWaitMs?: number
  minIntervalMs?: number
  send: (content: Content, baseVersion: number, keepalive: boolean) => Promise<{ version: number; savedAt: string }>
  onState: (state: SaveState) => void
  onVersion: (version: number) => void
  now?: () => number
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

export class Autosaver {
  private content: Content
  private sentContent: Content
  private baseVersion: number
  private dirtySince: number | null = null
  private lastSentAt = Number.NEGATIVE_INFINITY
  private timer: unknown = null
  private inFlight = false
  private stopped = false
  private conflict = false
  private failures = 0
  private readonly o: Required<AutosaveOptions>

  constructor(initial: Content, version: number, options: AutosaveOptions) {
    this.content = initial
    this.sentContent = initial
    this.baseVersion = version
    this.o = {
      idleMs: 3000,
      maxWaitMs: 30000,
      minIntervalMs: 5000,
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      ...options,
    }
  }

  get version(): number {
    return this.baseVersion
  }

  get hasUnsaved(): boolean {
    return !same(this.content, this.sentContent) || this.inFlight
  }

  get isConflict(): boolean {
    return this.conflict
  }

  /** 입력이 바뀔 때마다 부른다. */
  change(content: Content): void {
    this.content = content
    if (same(content, this.sentContent)) return
    if (this.dirtySince == null) this.dirtySince = this.o.now()
    if (!this.conflict) this.o.onState({ kind: 'dirty' })
    this.schedule(this.o.idleMs)
  }

  /** 탭이 가려지거나 페이지를 떠날 때: 기다리지 않고 바로 (keepalive). */
  flushNow(keepalive = false): Promise<void> {
    return this.send(keepalive)
  }

  /** 수동 저장·발행·충돌 해결 뒤 서버가 정한 새 기준을 반영한다. */
  reset(content: Content, version: number): void {
    this.content = content
    this.sentContent = content
    this.baseVersion = version
    this.dirtySince = null
    this.conflict = false
    this.failures = 0
    this.clear()
  }

  stop(): void {
    this.stopped = true
    this.clear()
  }

  private schedule(idle: number): void {
    if (this.stopped || this.conflict) return
    this.clear()
    const waited = this.dirtySince == null ? 0 : this.o.now() - this.dirtySince
    const delay = Math.max(0, Math.min(idle, this.o.maxWaitMs - waited), this.lastSentAt + this.o.minIntervalMs - this.o.now())
    this.timer = this.o.setTimer(() => void this.send(false), delay)
  }

  private clear(): void {
    if (this.timer != null) this.o.clearTimer(this.timer)
    this.timer = null
  }

  private async send(keepalive: boolean): Promise<void> {
    if (this.stopped || this.conflict || this.inFlight) return
    if (same(this.content, this.sentContent)) return
    this.clear()
    const sending = this.content
    this.inFlight = true
    this.lastSentAt = this.o.now()
    this.o.onState({ kind: 'saving' })
    try {
      const r = await this.o.send(sending, this.baseVersion, keepalive)
      this.baseVersion = r.version
      this.sentContent = sending
      this.failures = 0
      this.o.onVersion(r.version)
      if (same(this.content, sending)) {
        this.dirtySince = null
        this.o.onState({ kind: 'saved', at: new Date(r.savedAt) })
      } else {
        this.dirtySince = this.o.now()
        this.o.onState({ kind: 'dirty' })
        this.schedule(this.o.idleMs)
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') {
        this.conflict = true
        this.o.onState({ kind: 'conflict', server: (e.details as { server: ServerContent }).server })
      } else if (e instanceof ApiError && e.status === 429) {
        this.schedule((e.retryAfter ?? 5) * 1000)
      } else if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 408) {
        this.o.onState({ kind: 'error', message: e.fieldError('contentMd') ?? e.fieldError('title') ?? e.message })
      } else {
        // 서버에 닿지 못한 요청은 서버 최소 간격에 들어가지 않으므로 다시 보내기를 늦추지 않는다
        if (!(e instanceof ApiError)) this.lastSentAt = Number.NEGATIVE_INFINITY
        this.failures++
        this.o.onState({ kind: 'offline' })
        const backoff = Math.min(60_000, 2000 * 2 ** (this.failures - 1))
        this.schedule(backoff / 2 + Math.random() * backoff / 2)
      }
    } finally {
      this.inFlight = false
    }
  }
}

function same(a: Content, b: Content): boolean {
  return a.title === b.title && a.contentMd === b.contentMd
}
