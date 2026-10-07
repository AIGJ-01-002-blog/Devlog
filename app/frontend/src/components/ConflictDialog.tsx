import { diffLines, diffWordsWithSpace } from 'diff'
import { useMemo, useState } from 'react'
import { clock } from '../lib/format'
import type { Content } from '../lib/autosave'
import type { ServerContent } from '../lib/types'

/**
 * 저장된 내용과 편집 중인 내용을 나란히 비교 (docs/04 §2-7). 색만으로 구분하지 않고 −/+ 기호를 붙인다.
 * 버튼 이름에 결과를 적고, 되돌릴 수 없는 덮어쓰기에만 확인을 한 번 더 받는다.
 */
export function ConflictDialog({ server, mine, onOverwrite, onLoadServer, onSaveAsNew, onClose }: {
  server: ServerContent
  mine: Content
  onOverwrite: () => void
  onLoadServer: () => void
  onSaveAsNew: () => void
  onClose: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const rows = useMemo(() => buildRows(server.contentMd, mine.contentMd), [server.contentMd, mine.contentMd])
  const savedAt = clock(server.savedAt)

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <header className="dialog-header">
          <h2 id="conflict-title">저장된 내용과 지금 편집 중인 내용이 달라요</h2>
          <button type="button" className="btn btn-text" aria-label="닫고 계속 편집" onClick={onClose}>✕</button>
        </header>
        {server.title !== mine.title && (
          <div className="diff-title">
            <div><span className="diff-del">− {server.title || '(제목 없음)'}</span></div>
            <div><span className="diff-add">+ {mine.title || '(제목 없음)'}</span></div>
          </div>
        )}
        <div className="diff">
          <div className="diff-col">
            <h3>저장된 내용 · {savedAt} (다른 탭·기기)</h3>
            <pre>{rows.map((r, i) => <Line key={i} row={r} side="left" />)}</pre>
          </div>
          <div className="diff-col">
            <h3>지금 편집 중인 내용 · 이 탭</h3>
            <pre>{rows.map((r, i) => <Line key={i} row={r} side="right" />)}</pre>
          </div>
        </div>
        {confirming ? (
          <footer className="dialog-footer">
            <p>{savedAt}에 저장된 내용이 지금 편집 중인 내용으로 바뀌어요. 정말 저장할까요?</p>
            <button type="button" className="btn btn-primary" onClick={onOverwrite}>저장</button>
            <button type="button" className="btn btn-text" onClick={() => setConfirming(false)}>취소</button>
          </footer>
        ) : (
          <footer className="dialog-footer">
            <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>편집 중인 내용으로 저장</button>
            <button type="button" className="btn btn-outline" onClick={onLoadServer}>저장된 내용 불러오기</button>
            <button type="button" className="btn btn-outline" onClick={onSaveAsNew}>새 임시글로 따로 저장</button>
          </footer>
        )}
      </div>
    </div>
  )
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
