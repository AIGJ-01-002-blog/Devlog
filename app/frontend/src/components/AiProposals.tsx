import { useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import { relativeDate } from '../lib/format'
import { aiProposalsApi, type AiProposal } from '../lib/mcp'
import { navigate } from '../lib/router'

/**
 * 내 글 관리 › 임시글 탭 위의 "AI가 제안한 글" (061). 연결한 AI가 한 주제를 마쳤을 때 남긴 제목·쓸 범위를 보여 준다.
 * [임시글로 만들기]는 범위를 뼈대로 한 임시글을 만들어 편집 화면으로 간다. [넘기기]는 제안을 닫는다. 제안이 없으면 아무것도 그리지 않는다.
 */
export function AiProposals() {
  const [items, setItems] = useState<AiProposal[]>([])
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [loadFailed, setLoadFailed] = useState(false)

  const load = () => {
    setLoadFailed(false)
    aiProposalsApi.list().then(setItems).catch(() => setLoadFailed(true))
  }
  useEffect(load, [])

  if (loadFailed) {
    return (
      <section className="ai-proposals" aria-label="AI가 제안한 글">
        <p className="error" role="status">
          AI가 제안한 글을 불러오지 못했어요. <button type="button" className="btn btn-text" title="제안 목록을 다시 불러와요" onClick={load}>다시 시도</button>
        </p>
      </section>
    )
  }
  if (items.length === 0) return null

  const run = async (p: AiProposal, action: 'draft' | 'dismiss') => {
    setBusy(p.id)
    setError(null)
    try {
      if (action === 'draft') {
        const { postId } = await aiProposalsApi.draft(p.id)
        navigate(`/write/${postId}`)
        return
      }
      await aiProposalsApi.dismiss(p.id)
      setItems((list) => list.filter((i) => i.id !== p.id))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '처리하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="ai-proposals" aria-labelledby="ai-proposals-title">
      <h2 id="ai-proposals-title">AI가 제안한 글 <span className="muted">{items.length}</span></h2>
      <p className="muted small">연결한 AI가 한 주제를 마쳤을 때 글로 남기면 좋겠다고 제안한 것들이에요. AI에게 "제안한 글 써 줘"라고 해도 돼요.</p>
      <ul>
        {items.map((p) => (
          <li key={p.id} className="ai-proposal">
            <div className="ai-proposal-head">
              <b className="ai-proposal-title">{p.title}</b>
              <span className="muted small">{relativeDate(p.createdAt)}</span>
            </div>
            <p className="ai-proposal-scope">{p.scope}</p>
            {p.tags.length > 0 && <p className="muted small">{p.tags.map((t) => `#${t}`).join(' ')}</p>}
            <div className="ai-proposal-actions">
              <button type="button" className="btn btn-primary btn-small" disabled={busy !== null} title="제목과 쓸 범위로 임시글을 만들고 편집 화면을 열어요"
                onClick={() => run(p, 'draft')}>임시글로 만들기</button>
              <button type="button" className="btn btn-text" disabled={busy !== null} title="이 제안을 목록에서 치워요. AI도 다시 묻지 않아요"
                onClick={() => run(p, 'dismiss')}>넘기기</button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="error" role="status">{error}</p>}
    </section>
  )
}
