/**
 * 에디터 서식 도구 (spec 055). 고른 글자를 Markdown 기호로 감싸거나 줄 앞에 기호를 붙인다.
 * 결과는 "원문의 from~to를 insert로 바꾸고 selStart~selEnd를 고른다"는 한 번의 편집이라
 * 브라우저 되돌리기(Ctrl+Z)에 한 단계로 남는다.
 */
export type MdFormat = 'h2' | 'h3' | 'h4' | 'bold' | 'italic' | 'strike' | 'code' | 'quote' | 'ul' | 'ol' | 'link' | 'codeblock'

export interface MdEdit { from: number; to: number; insert: string; selStart: number; selEnd: number }

const WRAP: Partial<Record<MdFormat, { mark: string; placeholder: string }>> = {
  bold: { mark: '**', placeholder: '굵은 글씨' },
  italic: { mark: '_', placeholder: '기울인 글씨' },
  strike: { mark: '~~', placeholder: '취소선' },
  code: { mark: '`', placeholder: 'code' },
}

const PREFIX: Partial<Record<MdFormat, string>> = { h2: '## ', h3: '### ', h4: '#### ', quote: '> ', ul: '- ', ol: '1. ' }
const HEADING = /^#{1,6} /

/** 도구 버튼의 이름과 단축키. 툴팁에 "굵게 (Ctrl+B)"처럼 보인다. */
export const MD_TOOLS: { format: MdFormat; label: string; icon: string; key?: string }[] = [
  { format: 'h2', label: '제목 2', icon: 'H2' },
  { format: 'h3', label: '제목 3', icon: 'H3' },
  { format: 'h4', label: '제목 4', icon: 'H4' },
  { format: 'bold', label: '굵게', icon: 'B', key: 'b' },
  { format: 'italic', label: '기울임', icon: 'I', key: 'i' },
  { format: 'strike', label: '취소선', icon: 'S' },
  { format: 'quote', label: '인용', icon: '❝' },
  { format: 'ul', label: '글머리 목록', icon: '•' },
  { format: 'ol', label: '번호 목록', icon: '1.' },
  { format: 'link', label: '링크', icon: '🔗', key: 'k' },
  { format: 'code', label: '인라인 코드', icon: '</>' },
  { format: 'codeblock', label: '코드 블록', icon: '{ }' },
]

/** 단축키로 고를 서식. Ctrl(맥은 ⌘)과 함께 누른다. */
export function formatForKey(key: string): MdFormat | null {
  return MD_TOOLS.find((t) => t.key === key.toLowerCase())?.format ?? null
}

export function applyFormat(value: string, start: number, end: number, format: MdFormat): MdEdit {
  const wrap = WRAP[format]
  if (wrap) return wrapSelection(value, start, end, wrap.mark, wrap.placeholder)
  const prefix = PREFIX[format]
  if (prefix) return prefixLines(value, start, end, format, prefix)
  if (format === 'link') {
    const text = value.slice(start, end) || '링크 글자'
    const url = 'https://'
    const insert = `[${text}](${url})`
    const urlAt = start + text.length + 3
    return { from: start, to: end, insert, selStart: urlAt, selEnd: urlAt + url.length }
  }
  // codeblock: 줄 머리에서 시작하고 앞뒤를 빈 줄로 띄운다
  const selected = value.slice(start, end)
  const lead = start > 0 && value[start - 1] !== '\n' ? '\n' : ''
  const body = selected || 'code'
  const insert = `${lead}\`\`\`\n${body}\n\`\`\`\n`
  const bodyAt = start + lead.length + 4
  return { from: start, to: end, insert, selStart: bodyAt, selEnd: bodyAt + body.length }
}

/** 이미 감싸져 있으면 벗기고, 아니면 감싼다. 고른 글자가 없으면 자리 글자를 넣어 골라 둔다. */
function wrapSelection(value: string, start: number, end: number, mark: string, placeholder: string): MdEdit {
  const n = mark.length
  const selected = value.slice(start, end)
  if (value.slice(start - n, start) === mark && value.slice(end, end + n) === mark && start >= n) {
    return { from: start - n, to: end + n, insert: selected, selStart: start - n, selEnd: end - n }
  }
  if (selected.length >= 2 * n && selected.startsWith(mark) && selected.endsWith(mark)) {
    const inner = selected.slice(n, -n)
    return { from: start, to: end, insert: inner, selStart: start, selEnd: start + inner.length }
  }
  const text = selected || placeholder
  return { from: start, to: end, insert: mark + text + mark, selStart: start + n, selEnd: start + n + text.length }
}

/** 고른 줄마다 앞에 기호를 붙인다. 모든 줄에 이미 있으면 뗀다. 제목은 다른 단계의 #을 바꿔 단다. */
function prefixLines(value: string, start: number, end: number, format: MdFormat, prefix: string): MdEdit {
  const from = value.lastIndexOf('\n', start - 1) + 1
  const nl = value.indexOf('\n', Math.max(end, start) - (end > start && value[end - 1] === '\n' ? 1 : 0))
  const to = nl === -1 ? value.length : nl
  const lines = value.slice(from, to).split('\n')
  const isHeading = format.startsWith('h')
  const numbered = format === 'ol'
  const has = (l: string) => (numbered ? /^\d+\. /.test(l) : l.startsWith(prefix))
  const all = lines.every((l) => has(l) || l.trim() === '')
  let n = 0
  const next = lines.map((l) => {
    if (l.trim() === '' && lines.length > 1) return l
    if (all) return numbered ? l.replace(/^\d+\. /, '') : l.slice(prefix.length)
    const base = isHeading ? l.replace(HEADING, '') : l
    // 빈 줄은 번호를 세지 않는다
    return (numbered ? `${++n}. ` : prefix) + base
  })
  const insert = next.join('\n')
  // 한 줄이고 고른 글자가 없으면 커서를 줄 끝에 둔다
  const single = lines.length === 1 && start === end
  return { from, to, insert, selStart: single ? from + insert.length : from, selEnd: from + insert.length }
}
