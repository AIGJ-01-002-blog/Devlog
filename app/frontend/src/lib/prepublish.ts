import { bodyImages } from './postImages'
import { thumbnailPreview, type ThumbnailChoice } from './postThumbnail'
import { t } from './i18n'

// 발행 전 점검 (057). Crowfoot의 "설계 검증"처럼 발행 창에서 글을 한 번 훑어 놓치기 쉬운 것을 알려 준다.
// 발행을 막지 않는다. 막아야 하는 규칙(빈 제목, 올리는 중인 사진 등)은 서버와 기존 오류 표시가 맡는다.

export type CheckLevel = 'ok' | 'warn' | 'info'

export interface CheckItem {
  id: string
  level: CheckLevel
  text: string
}

export interface PrepublishInput {
  title: string
  contentMd: string
  summary: string
  tags: string[]
  thumbnail: ThumbnailChoice
}

/** 본문이 이보다 짧으면 알린다(코드·사진 문법은 빼고 센다). */
export const SHORT_BODY = 200

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/

/** 펜스가 같은 글자(` 또는 ~)이고 여는 펜스보다 짧지 않으며 뒤에 글자가 없으면 닫는 펜스다 (CommonMark). */
function closes(open: string, m: RegExpExecArray): boolean {
  return m[1][0] === open[0] && m[1].length >= open.length && !m[2].trim()
}

/** 코드 블록을 열고 닫는 줄을 훑는다. 닫히지 않은 블록과 언어를 적지 않은 블록 수를 센다. */
export function codeFences(md: string): { unclosed: boolean; noLang: number } {
  let open: string | null = null
  let noLang = 0
  for (const line of md.split('\n')) {
    const m = FENCE.exec(line)
    if (!m) continue
    if (open == null) {
      open = m[1]
      if (!m[2].trim()) noLang++
    } else if (closes(open, m)) {
      open = null
    }
  }
  return { unclosed: open != null, noLang }
}

/** 코드 블록(펜스 줄 포함)을 뺀 본문. codeFences와 같은 닫기 규칙을 쓴다. */
export function outsideFences(md: string): string {
  const out: string[] = []
  let open: string | null = null
  for (const line of md.split('\n')) {
    const m = FENCE.exec(line)
    if (open == null) {
      if (m) open = m[1]
      else out.push(line)
    } else if (m && closes(open, m)) {
      open = null
    }
  }
  return out.join('\n')
}

/** 코드 블록 밖의 글자 수. 사진·링크 주소는 빼고 센다. */
export function proseLength(md: string): number {
  return outsideFences(md)
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-\s]/g, '').length
}

/** 코드 블록 밖에서 주소가 비어 있는 링크·사진 수: [글자]() */
export function emptyLinks(md: string): number {
  return [...outsideFences(md).matchAll(/\[[^\]]*]\(\s*\)/g)].length
}

/** 본문 첫 제목(# …)이 글 제목과 같으면 화면에 제목이 두 번 보인다. */
export function repeatsTitle(title: string, md: string): boolean {
  const first = md.split('\n').find((l) => l.trim() !== '')
  const m = first ? /^#\s+(.+?)\s*#*\s*$/.exec(first.trim()) : null
  return !!m && !!title.trim() && m[1].trim() === title.trim()
}

export function prepublishChecks(p: PrepublishInput): CheckItem[] {
  const items: CheckItem[] = []
  const images = bodyImages(outsideFences(p.contentMd))
  const noAlt = images.filter((i) => !i.alt.trim()).length
  const fences = codeFences(p.contentMd)
  const empty = emptyLinks(p.contentMd)
  const length = proseLength(p.contentMd)

  items.push(p.summary.trim()
    ? { id: 'summary', level: 'ok', text: t('짧은 소개가 있어요') }
    : { id: 'summary', level: 'info', text: t('짧은 소개가 없어 본문 앞부분이 목록에 보여요') })
  items.push(p.tags.length > 0
    ? { id: 'tags', level: 'ok', text: t('태그 {0}개', { 0: p.tags.length }) }
    : { id: 'tags', level: 'warn', text: t('태그가 없으면 태그·검색으로 찾기 어려워요') })
  items.push(thumbnailPreview(p.thumbnail, p.contentMd)
    ? { id: 'thumbnail', level: 'ok', text: t('목록에 대표 사진이 보여요') }
    : { id: 'thumbnail', level: 'info', text: t('목록에 대표 사진 없이 보여요') })
  if (images.length > 0) {
    items.push(noAlt === 0
      ? { id: 'alt', level: 'ok', text: t('모든 사진에 대체글이 있어요') }
      : { id: 'alt', level: 'warn', text: t('대체글이 없는 사진 {0}장', { 0: noAlt }) })
  }
  if (length < SHORT_BODY) items.push({ id: 'length', level: 'info', text: t('본문이 짧아요 ({0}자)', { 0: length }) })
  if (repeatsTitle(p.title, p.contentMd)) items.push({ id: 'heading', level: 'warn', text: t('본문 첫 줄 제목이 글 제목과 같아 두 번 보여요') })
  if (fences.unclosed) items.push({ id: 'fence', level: 'warn', text: t('닫히지 않은 코드 블록이 있어요 (``` 짝 확인)') })
  else if (fences.noLang > 0) items.push({ id: 'lang', level: 'info', text: t('언어를 적지 않은 코드 블록 {0}개 (```java처럼 적으면 색이 입혀져요)', { 0: fences.noLang }) })
  if (empty > 0) items.push({ id: 'links', level: 'warn', text: t('주소가 빈 링크 {0}개', { 0: empty }) })
  return items
}
