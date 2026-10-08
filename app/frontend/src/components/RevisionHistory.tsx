import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../lib/api'
import { revisionLabel, revisions, type Revision, type RevisionItem } from '../lib/revisions'
import type { Content } from '../lib/autosave'
import { Modal } from './Modal'
import { changedLines, TextDiff } from './TextDiff'

/**
 * 글 수정 이력 (058). Crowfoot의 "버전 기록"처럼 발행한 판을 고르고 지금 편집 중인 내용과 비교한다.
 * [이 판 불러오기]는 편집기 내용만 바꾼다. 평소처럼 저장되고, 다시 발행해야 독자에게 보인다.
 */
export function RevisionHistory({ postId, current, onLoad, onClose }: {
  postId: number
  current: Content
  onLoad: (r: Revision) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<RevisionItem[] | null>(null)
  const [selected, setSelected] = useState<Revision | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    revisions.list(postId)
      .then((list) => {
        setItems(list)
        if (list.length > 0) void pick(list[0].no)
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : '수정 이력을 불러오지 못했어요.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  // 판을 빠르게 바꿔 고르면 늦게 온 앞 응답이 마지막 선택을 덮지 않게, 마지막 요청만 반영한다
  const latestPick = useRef(0)
  async function pick(no: number) {
    const seq = ++latestPick.current
    try {
      const r = await revisions.get(postId, no)
      if (seq === latestPick.current) setSelected(r)
    } catch (e) {
      if (seq === latestPick.current) setError(e instanceof ApiError ? e.message : '이 판을 불러오지 못했어요.')
    }
  }

  const latestNo = items?.[0]?.no ?? 0
  const delta = selected ? changedLines(selected.contentMd, current.contentMd) : null
  const same = selected != null && selected.title === current.title && selected.contentMd === current.contentMd

  return (
    <Modal labelledBy="revisions-title" onClose={onClose} wide>
      <header className="dialog-header">
        <h2 id="revisions-title">수정 이력</h2>
        <button type="button" className="btn btn-text" aria-label="수정 이력 닫기" data-tip="닫기" onClick={onClose}>✕</button>
      </header>
      <p className="muted small">발행할 때마다 한 판씩 남아요(최근 50판). 판을 고르면 지금 편집 중인 내용과 비교해요.</p>
      {error && <p className="error small" role="alert">{error}</p>}
      {items == null && !error && <p className="muted">불러오는 중…</p>}
      {items?.length === 0 && <p className="muted">아직 발행한 판이 없어요.</p>}
      {items && items.length > 0 && (
        <div className="revisions">
          <ol className="revision-list" aria-label="발행한 판">
            {items.map((it) => (
              <li key={it.no}>
                <button type="button" className={`revision-item${selected?.no === it.no ? ' active' : ''}`}
                        aria-current={selected?.no === it.no ? 'true' : undefined}
                        data-tip={`${it.no}판과 지금 내용 비교하기`} onClick={() => void pick(it.no)}>
                  <b>{revisionLabel(it, latestNo)}</b>
                  <span className="muted small">{new Date(it.createdAt).toLocaleString('ko-KR')} · {it.length.toLocaleString('ko-KR')}자</span>
                  <span className="small revision-title">{it.title || '제목 없음'}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="revision-compare">
            {selected && (
              <>
                <p className="small" role="status">
                  {same ? '지금 편집 중인 내용과 같아요.' : `${selected.no}판 → 지금: +${delta!.added}줄 −${delta!.removed}줄`}
                </p>
                {selected.title !== current.title && (
                  <div className="diff-title">
                    <div><span className="diff-del">− {selected.title || '(제목 없음)'}</span></div>
                    <div><span className="diff-add">+ {current.title || '(제목 없음)'}</span></div>
                  </div>
                )}
                <TextDiff before={selected.contentMd} after={current.contentMd}
                          beforeLabel={`${selected.no}판 · ${new Date(selected.createdAt).toLocaleString('ko-KR')}`}
                          afterLabel="지금 편집 중인 내용" />
              </>
            )}
          </div>
        </div>
      )}
      <footer className="dialog-footer revisions-footer">
        <button type="button" className="btn btn-text" onClick={onClose}>닫기</button>
        <button type="button" className="btn btn-primary" disabled={!selected || same}
                data-tip="편집기 내용을 이 판으로 바꿔요. 지금 내용은 이 기기 백업에 남고, 다시 발행해야 독자에게 보여요."
                onClick={() => selected && onLoad(selected)}>
          {selected ? `${selected.no}판 불러오기` : '판 불러오기'}
        </button>
      </footer>
    </Modal>
  )
}
