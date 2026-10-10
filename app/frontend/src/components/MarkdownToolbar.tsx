import type { RefObject } from 'react'
import { applyFormat, MD_TOOLS, type MdEdit, type MdFormat } from '../lib/mdFormat'
import { t } from '../lib/i18n'

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'

/**
 * 본문 위 서식 도구 (spec 055). 버튼마다 툴팁에 이름과 단축키가 보인다.
 * insertText로 바꿔 Ctrl+Z 되돌리기가 한 단계로 남고, 그게 안 되는 환경에서는 onChange로 값을 넘긴다.
 */
export function applyMdEdit(el: HTMLTextAreaElement, edit: MdEdit, onChange: (next: string) => void) {
  el.focus()
  el.setSelectionRange(edit.from, edit.to)
  let done = false
  try { done = document.execCommand('insertText', false, edit.insert) } catch { done = false }
  // insertText가 input 이벤트를 꼭 내지는 않아(MDN) 성공했어도 바뀐 값을 상태에 넘긴다
  const applied = done && el.value.slice(edit.from, edit.from + edit.insert.length) === edit.insert
  onChange(applied ? el.value : el.value.slice(0, edit.from) + edit.insert + el.value.slice(edit.to))
  requestAnimationFrame(() => el.setSelectionRange(edit.selStart, edit.selEnd))
}

export function formatTextarea(el: HTMLTextAreaElement, format: MdFormat, onChange: (next: string) => void) {
  applyMdEdit(el, applyFormat(el.value, el.selectionStart, el.selectionEnd, format), onChange)
}

export function MarkdownToolbar({ bodyRef, onChange }: { bodyRef: RefObject<HTMLTextAreaElement | null>; onChange: (next: string) => void }) {
  return (
    <div className="md-toolbar" role="toolbar" aria-label={t('서식')}>
      {MD_TOOLS.map((t, i) => (
        <span key={t.format} className="md-tool-wrap">
          {(i === 3 || i === 6 || i === 9) && <span className="md-sep" aria-hidden="true" />}
          <button type="button" className={`md-tool md-${t.format}`} aria-label={t.label}
                  data-tip={t.key ? `${t.label} (${MOD}${t.key.toUpperCase()})` : t.label}
                  // 누를 때 본문 초점·선택이 풀리지 않게
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { if (bodyRef.current) formatTextarea(bodyRef.current, t.format, onChange) }}>
            <span aria-hidden="true">{t.icon}</span>
          </button>
        </span>
      ))}
    </div>
  )
}
