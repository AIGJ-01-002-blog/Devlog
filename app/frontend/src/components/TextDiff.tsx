import { diffLines, diffWordsWithSpace } from 'diff'
import { useMemo } from 'react'

/**
 * 두 글을 줄 단위로 나란히 비교한다 (충돌 창 docs/04 §2-7, 수정 이력 054). 색만으로 구분하지 않고 −/+ 기호를 붙인다.
 * 좁은 화면에서는 두 칸이 위아래로 쌓인다(.diff 미디어 쿼리).
 */
export function TextDiff({ before, after, beforeLabel, afterLabel }: {
  before: string
  after: string
  beforeLabel: string
  afterLabel: string
}) {
  const rows = useMemo(() => buildRows(before, after), [before, after])
  return (
    <div className="diff">
      <div className="diff-col">
        <h3>{beforeLabel}</h3>
        <pre>{rows.map((r, i) => <Line key={i} row={r} side="left" />)}</pre>
      </div>
      <div className="diff-col">
        <h3>{afterLabel}</h3>
        <pre>{rows.map((r, i) => <Line key={i} row={r} side="right" />)}</pre>
      </div>
    </div>
  )
}

/** 바뀐 줄 수 (−/+ 요약용). */
export function changedLines(before: string, after: string): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const p of diffLines(before, after)) {
    if (p.added) added += p.count ?? 0
    else if (p.removed) removed += p.count ?? 0
  }
  return { added, removed }
}

interface Row {
  kind: 'same' | 'del' | 'add' | 'change'
  left: string
  right: string
}

function buildRows(oldText: string, newText: string): Row[] {
  const parts = diffLines(oldText, newText)
  const rows: Row[] = []
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    const next = parts[i + 1]
    if (p.removed && next?.added) {
      rows.push({ kind: 'change', left: p.value, right: next.value })
      i++
    } else if (p.removed) rows.push({ kind: 'del', left: p.value, right: '' })
    else if (p.added) rows.push({ kind: 'add', left: '', right: p.value })
    else rows.push({ kind: 'same', left: p.value, right: p.value })
  }
  return rows
}

function Line({ row, side }: { row: Row; side: 'left' | 'right' }) {
  if (row.kind === 'same') {
    const text = row.left
    const lines = text.split('\n')
    // 바뀌지 않은 긴 구간은 접는다
    if (lines.length > 8) {
      return <span className="diff-same">{lines.slice(0, 3).join('\n')}{'\n'}<span className="diff-fold">⋯ 같은 내용 {lines.length - 6}줄 ⋯</span>{'\n'}{lines.slice(-3).join('\n')}</span>
    }
    return <span className="diff-same">{text}</span>
  }
  if (row.kind === 'change') {
    const words = diffWordsWithSpace(row.left, row.right)
    return (
      <span className={side === 'left' ? 'diff-del' : 'diff-add'}>
        {side === 'left' ? '− ' : '+ '}
        {words.filter((w) => (side === 'left' ? !w.added : !w.removed)).map((w, i) =>
          (w.added || w.removed) ? <mark key={i}>{w.value}</mark> : <span key={i}>{w.value}</span>)}
      </span>
    )
  }
  const text = side === 'left' ? row.left : row.right
  if (!text) return <span className="diff-gap">{'\n'.repeat(Math.max(0, (row.left || row.right).split('\n').length - 1))}</span>
  return <span className={row.kind === 'del' ? 'diff-del' : 'diff-add'}>{row.kind === 'del' ? '− ' : '+ '}{text}</span>
}
