import { useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import { topicApi, type Suggestion, type SuggestResult } from '../lib/branch'
import { seriesApi, type MySeries } from '../lib/series'
import { BranchMark } from './BranchList'

/** 태그를 바꾸고 잠시 뒤에 다시 묻는다 */
const DEBOUNCE_MS = 400

/**
 * 발행 창 브랜치 추천 (072 2단계). 지금 태그와 가장 많이 겹치는 내 시리즈·주제 브랜치를 먼저 보여 준다.
 * [이 시리즈에 넣기]는 바로 저장하고, 주제 브랜치는 자동으로 묶이므로 [이어 붙이기]는 다음 계산 때 이어진다는 안내다.
 * [묶지 않기]를 고르면 이 글은 주제 브랜치로 자동으로 묶이지 않는다. 곁들이 기능이라 실패해도 발행은 그대로 된다.
 */
export function BranchSuggest({ postId, tags }: { postId: number; tags: string[] }) {
  const [result, setResult] = useState<SuggestResult | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [picking, setPicking] = useState<MySeries[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const key = tags.join('\u0000')

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      topicApi.suggest(postId, tags).then((r) => { if (alive) setResult(r) }, () => { if (alive) setResult(null) })
    }, DEBOUNCE_MS)
    return () => { alive = false; clearTimeout(t) }
    // tags는 key로 비교한다(배열이 매번 새로 만들어져도 같은 태그면 다시 묻지 않는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, key, version])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }
  const intoSeries = (seriesId: number) => run(async () => {
    await seriesApi.assign(postId, seriesId)
    setPicking(null)
    setVersion((v) => v + 1)
  })
  const optOut = (on: boolean) => run(async () => {
    await topicApi.optOut(postId, on)
    setAccepted(false)
    setVersion((v) => v + 1)
  })
  const pickSeries = () => run(async () => setPicking(await seriesApi.mine()))

  if (!result) return null
  const { current, series, topic, optedOut } = result

  if (current?.kind === 'SERIES') {
    return (
      <div className="branch-suggest" role="status">
        <Label s={current} /> <span className="muted small">시리즈로 이어져요.</span>
        {result.portfolio && <p className="small branch-suggest-ok">이 시리즈는 포트폴리오 프로젝트라 이 글도 포트폴리오에 보여요.</p>}
      </div>
    )
  }
  const best: Suggestion | null = series ?? topic ?? current
  return (
    <div className="branch-suggest">
      <p className="branch-suggest-title">브랜치</p>
      {optedOut ? (
        <p className="small">
          이 글은 비슷한 글과 자동으로 묶지 않아요.{' '}
          <button type="button" className="btn btn-text btn-small" disabled={busy} onClick={() => void optOut(false)}>다시 묶기</button>
        </p>
      ) : current ? (
        <p className="small"><Label s={current} /> 브랜치에 이어져 있어요.</p>
      ) : best ? (
        <p className="small">
          가장 비슷한 브랜치: <Label s={best} />
          {best.shared.length > 0 && <span className="muted"> · 함께 쓴 태그 {best.shared.map((t) => `#${t}`).join(' ')}</span>}
        </p>
      ) : (
        <p className="small muted">비슷한 브랜치가 아직 없어요. 발행하면 main에 새 글로 올라가요.</p>
      )}
      {accepted && topic && <p className="small branch-suggest-ok" role="status">발행하면 다음 계산 때 {topic.name} 브랜치에 이어져요.</p>}
      {picking && (
        <label className="small branch-suggest-pick">
          <span className="sr-only">넣을 시리즈</span>
          <select defaultValue="" disabled={busy} onChange={(e) => { if (e.target.value) void intoSeries(Number(e.target.value)) }}>
            <option value="" disabled>{picking.length ? '시리즈 고르기' : '시리즈가 없어요. 글쓰기 화면 [시리즈]에서 만들 수 있어요'}</option>
            {picking.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.postCount})</option>)}
          </select>
        </label>
      )}
      <div className="row branch-suggest-actions">
        {series?.seriesId != null && (
          <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => void intoSeries(series.seriesId!)}
                  data-tip={`이 글을 ${series.name} 시리즈 마지막 편으로 넣어요`}>이 시리즈에 넣기</button>
        )}
        {!series && topic && !optedOut && !accepted && (
          <button type="button" className="btn btn-outline btn-small" onClick={() => setAccepted(true)}
                  data-tip="비슷한 글은 자동으로 이어져요. 발행 뒤 다음 계산 때 붙어요">이 브랜치에 이어 붙이기</button>
        )}
        {!picking && (
          <button type="button" className="btn btn-text btn-small" disabled={busy} onClick={() => void pickSeries()}
                  data-tip="내 시리즈 중 하나를 골라 넣어요">내 시리즈에 넣기</button>
        )}
        {!optedOut && (
          <button type="button" className="btn btn-text btn-small" disabled={busy} onClick={() => void optOut(true)}
                  data-tip="이 글은 비슷한 글과 자동으로 묶지 않아요">묶지 않기</button>
        )}
      </div>
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  )
}

function Label({ s }: { s: Suggestion }) {
  const body = <><BranchMark kind={s.kind} />{s.name}</>
  const cls = `bl-branch bl-branch-${s.kind.toLowerCase()}`
  return s.url ? <a href={s.url} className={cls} target="_blank" rel="noopener" data-tip="새 탭에서 브랜치 보기">{body}</a> : <span className={cls}>{body}</span>
}
