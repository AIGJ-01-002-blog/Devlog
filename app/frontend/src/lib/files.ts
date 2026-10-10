// 글 첨부파일 (022). 서버 규칙(PostFiles·FileInspector)과 같은 값을 화면에서 먼저 확인해 헛된 업로드를 줄인다.
import { api, ApiError } from './api'
import { t } from './i18n'

export interface Attachment {
  id: number
  name: string
  sizeBytes: number
  contentType: string
}

export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MAX_FILES = 20
export const EXTENSIONS = ['pdf', 'zip', 'txt', 'md', 'csv', 'docx', 'xlsx', 'pptx']
export const ACCEPT = EXTENSIONS.map((e) => `.${e}`).join(',')
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'avif', 'bmp', 'svg']

export function extension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

/** 올리기 전 확인. 문제가 없으면 null. 내용 검사는 서버가 다시 한다. */
export function checkFile(file: { name: string; size: number }, count: number): string | null {
  if (count >= MAX_FILES) return t('첨부는 {0}개까지 할 수 있어요.', { 0: MAX_FILES })
  const ext = extension(file.name)
  if (IMAGE_EXTENSIONS.includes(ext)) return t('사진은 본문에 넣어 주세요.')
  if (!EXTENSIONS.includes(ext)) return t('{0} 파일만 첨부할 수 있어요.', { 0: EXTENSIONS.join(', ') })
  if (file.size === 0) return t('빈 파일은 첨부할 수 없어요.')
  if (file.size > MAX_FILE_BYTES) return t('파일 하나는 20MB까지 첨부할 수 있어요.')
  return null
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  const mb = bytes / 1024 / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)}MB`
}

/** 위·아래로 한 칸 옮긴 새 목록. 끝을 넘으면 그대로다. */
export function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list
  const next = list.slice()
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

export function downloadUrl(postId: number, fileId: number): string {
  return `/api/posts/${postId}/files/${fileId}`
}

export function uploadFile(file: File): Promise<Attachment> {
  return api<Attachment>('/api/files', {
    method: 'POST',
    rawBody: new Blob([file], { type: 'application/octet-stream' }),
    headers: { 'X-File-Name': encodeURIComponent(file.name) },
  })
}

export function listFiles(postId: number): Promise<Attachment[]> {
  return api<Attachment[]>(`/api/posts/${postId}/files`)
}

export function saveFiles(postId: number, ids: number[]): Promise<Attachment[]> {
  return api<Attachment[]>(`/api/posts/${postId}/files`, { method: 'PUT', body: { fileIds: ids } })
}

export function fileErrorText(e: unknown): string {
  if (e instanceof ApiError) return e.fieldError('fileIds') ?? e.message
  return t('파일을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요.')
}
