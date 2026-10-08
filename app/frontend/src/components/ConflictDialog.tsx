import { useState } from 'react'
import { clock } from '../lib/format'
import { Modal } from './Modal'
import { TextDiff } from './TextDiff'
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
  const savedAt = clock(server.savedAt)

  return (
    <Modal labelledBy="conflict-title" onClose={onClose} wide>
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
      <TextDiff before={server.contentMd} after={mine.contentMd}
                beforeLabel={`저장된 내용 · ${savedAt} (다른 탭·기기)`} afterLabel="지금 편집 중인 내용 · 이 탭" />
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
    </Modal>
  )
}
