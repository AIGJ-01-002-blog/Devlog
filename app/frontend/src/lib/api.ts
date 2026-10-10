import { t } from './i18n'
// 서버 API 호출. 쿠키 세션 + CSRF(XSRF-TOKEN 쿠키 → X-XSRF-TOKEN 헤더), 공통 오류 형식 {code, message, errors, details}.

export interface FieldError {
  field: string
  code: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: FieldError[]
  readonly details: unknown
  readonly retryAfter: number | null

  constructor(status: number, code: string, message: string, errors: FieldError[] = [], details: unknown = null,
              retryAfter: number | null = null) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
    this.details = details
    this.retryAfter = retryAfter
  }

  fieldError(field: string): string | undefined {
    return this.errors.find((e) => e.field === field)?.message
  }
}

function csrfToken(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** JSON 대신 그대로 보낼 본문(사진 올리기). Content-Type은 Blob의 형식을 쓴다 */
  rawBody?: Blob
  headers?: Record<string, string>
  keepalive?: boolean
  signal?: AbortSignal
}

/** 쓰기 요청 전에 CSRF 쿠키가 없으면 한 번 받아 둔다 (첫 방문 직후 바로 쓰기를 할 때). */
async function ensureCsrf(): Promise<void> {
  if (csrfToken()) return
  await fetch('/api/auth/me', { credentials: 'same-origin' }).catch(() => undefined)
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  if (method !== 'GET') {
    await ensureCsrf()
    const token = csrfToken()
    if (token) headers['X-XSRF-TOKEN'] = token
  }
  if (options.rawBody) headers['Content-Type'] = options.rawBody.type || 'application/octet-stream'
  else if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
      keepalive: options.keepalive,
      signal: options.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK', t('네트워크에 연결할 수 없어요.'))
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) throw errorOf(res, data)
  return data as T
}

/** 파일로 받는 GET (059 내보내기, 080 소셜 사진 대신 받기). 오류는 {@link api}와 같은 ApiError로 던진다. */
export async function apiFile(path: string, signal?: AbortSignal): Promise<{ blob: Blob; fileName: string | null }> {
  let res: Response
  try {
    res = await fetch(path, { credentials: 'same-origin', signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK', t('네트워크에 연결할 수 없어요.'))
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw errorOf(res, text ? safeJson(text) : null)
  }
  return { blob: await res.blob(), fileName: attachmentName(res.headers.get('Content-Disposition')) }
}

/** Content-Disposition의 파일 이름. filename*=UTF-8''…(RFC 5987)을 먼저 본다. */
export function attachmentName(header: string | null): string | null {
  if (!header) return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim())
    } catch {
      // 잘못 인코딩된 값이면 아래의 filename=을 쓴다
    }
  }
  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? null
}

function errorOf(res: Response, data: unknown): ApiError {
  const body = (data ?? {}) as Partial<{ code: string; message: string; errors: FieldError[]; details: unknown }>
  const retry = res.headers.get('Retry-After')
  return new ApiError(res.status, body.code ?? `HTTP_${res.status}`, body.message ?? t('잠시 후 다시 시도해 주세요.'),
    body.errors ?? [], body.details ?? null, retry ? Number(retry) : null)
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** 서버가 페이지에 넣어 준 첫 화면 데이터. 한 번 꺼내면 지운다(뒤로 가기 등으로 다시 쓰지 않게). */
let initialData: Record<string, unknown> | null | undefined
export function takeInitialData<T>(page: string): T | null {
  if (initialData === undefined) {
    const el = document.getElementById('initial-data')
    initialData = el?.textContent ? (safeJson(el.textContent) as Record<string, unknown>) : null
  }
  if (!initialData || initialData.page !== page) return null
  const d = initialData as T
  initialData = null
  return d
}
