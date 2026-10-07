import { useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import { SERIES_NAME_MAX, seriesApi, seriesNameError, type MySeries } from '../lib/series'

/**
 * 글쓰기 화면의 [시리즈] (024 US1). 고르는 즉시 저장한다. 임시글도 넣을 수 있고 독자에게는 발행된 뒤에 보인다.
 * "새 시리즈"는 만들고 바로 이 글을 넣는다.
 */
export function SeriesPicker({ postId }: { postId: number }) {
  const [series, setSeries] = useState<MySeries[] | null>(null)
  const [current, setCurrent] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([seriesApi.mine(), seriesApi.ofPost(postId)])
      .then(([mine, nav]) => { if (alive) { setSeries(mine); setCurrent(nav?.id ?? null) } })
      .catch(() => { if (alive) setSeries([]) })
    return () => { alive = false }
  }, [postId])

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

  const choose = (value: string) => {
    if (value === 'new') return setCreating(true)
    const id = value ? Number(value) : null
    void run(async () => {
      await seriesApi.assign(postId, id)
      setCurrent(id)
    })
  }

  const create = () => {
    const invalid = seriesNameError(name)
    if (invalid) return setError(invalid)
    void run(async () => {
      const made = await seriesApi.create(name)
      await seriesApi.assign(postId, made.id)
      setSeries((l) => [{ ...made, postCount: 1 }, ...(l ?? [])])
      setCurrent(made.id)
      setCreating(false)
      setName('')
    })
  }

  if (!series) return null
  return (
    <div className="series-picker">
      <label>
        <span className="muted small">시리즈</span>{' '}
        <select value={current ?? ''} disabled={busy} onChange={(e) => choose(e.target.value)}>
          <option value="">시리즈 없음</option>
          {series.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.postCount})</option>)}
          <option value="new">+ 새 시리즈</option>
        </select>
      </label>
      {creating && (
        <span className="row series-new">
          <input aria-label="새 시리즈 이름" value={name} maxLength={SERIES_NAME_MAX} autoFocus placeholder="시리즈 이름"
                 onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create() } }} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={create}>만들기</button>
          <button type="button" className="btn btn-text" onClick={() => { setCreating(false); setError(null) }}>취소</button>
        </span>
      )}
      {error && <small className="error" role="alert">{error}</small>}
    </div>
  )
}
