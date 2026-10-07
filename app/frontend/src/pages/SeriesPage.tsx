import { useEffect, useState } from 'react'
import { PostCard } from '../components/PostCard'
import { ApiError } from '../lib/api'
import { move } from '../lib/files'
import { fullDate, relativeDate } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { SERIES_NAME_MAX, seriesApi, seriesNameError, seriesPath, type SeriesDetail } from '../lib/series'
import type { Card } from '../lib/types'
import { NotFoundPage } from './NotFoundPage'

/** 시리즈 페이지 /@블로그/series/이름 (024 US2-2·US3). 주인은 순서 바꾸기·빼기·이름 바꾸기·삭제를 한다. */
export function SeriesPage({ handle, slug }: { handle: string; slug: string }) {
  const [series, setSeries] = useState<SeriesDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const [editing, setEditing] = useState<Card[] | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    seriesApi.detail(handle, slug)
      .then((s) => { if (alive) { setSeries(s); document.title = `${s.name} - 시리즈` } })
      .catch((e) => { if (alive && e instanceof ApiError && e.status === 404) setMissing(true) })
    return () => { alive = false }
  }, [handle, slug])

  if (missing) return <NotFoundPage />
  if (!series) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

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

  const saveOrder = (posts: Card[]) => run(async () => {
    await seriesApi.reorder(series.id, posts.map((p) => p.id))
    setSeries({ ...series, posts, updatedAt: new Date().toISOString() })
    setEditing(null)
  })

  const rename = (name: string) => {
    const invalid = seriesNameError(name)
    if (invalid) return setError(invalid)
    void run(async () => {
      const r = await seriesApi.rename(series.id, name)
      setRenaming(null)
      if (r.slug !== series.slug) navigate(seriesPath(handle, r.slug), { replace: true })
      else setSeries({ ...series, name: r.name })
    })
  }

  const remove = () => {
    if (!confirm(`'${series.name}' 시리즈를 지울까요? 글은 지워지지 않아요.`)) return
    void run(async () => {
      await seriesApi.remove(series.id)
      navigate(`/@${handle}/series`, { replace: true })
    })
  }

  return (
    <main className="container narrow series-page">
      <p className="muted small"><Link to={`/@${handle}/series`}>@{handle}의 시리즈</Link></p>
      {renaming != null ? (
        <form className="row series-rename" onSubmit={(e) => { e.preventDefault(); rename(renaming) }}>
          <input aria-label="시리즈 이름" value={renaming} maxLength={SERIES_NAME_MAX} autoFocus onChange={(e) => setRenaming(e.target.value)} />
          <button className="btn btn-primary" disabled={busy}>저장</button>
          <button type="button" className="btn btn-text" onClick={() => { setRenaming(null); setError(null) }}>취소</button>
        </form>
      ) : <h1>{series.name}</h1>}
      <p className="muted small">
        글 {series.posts.length}개 · <time dateTime={series.updatedAt} title={fullDate(series.updatedAt)}>{relativeDate(series.updatedAt)} 수정</time>
      </p>
      {series.mine && !editing && renaming == null && (
        <div className="row series-owner">
          <button type="button" className="btn btn-text" onClick={() => setEditing(series.posts)} disabled={series.posts.length === 0}>순서 편집</button>
          <button type="button" className="btn btn-text" onClick={() => setRenaming(series.name)}>이름 바꾸기</button>
          <button type="button" className="btn btn-text danger" onClick={remove} disabled={busy}>시리즈 삭제</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {editing ? (
        <>
          <ol className="series-edit">
            {editing.map((p, i) => (
              <li key={p.id} className="row">
                <span className="grow">{p.title}</span>
                <button type="button" className="btn btn-text" aria-label={`${p.title} 위로`} disabled={i === 0}
                        onClick={() => setEditing(move(editing, i, -1))}>↑</button>
                <button type="button" className="btn btn-text" aria-label={`${p.title} 아래로`} disabled={i === editing.length - 1}
                        onClick={() => setEditing(move(editing, i, 1))}>↓</button>
                <button type="button" className="btn btn-text danger" aria-label={`${p.title} 시리즈에서 빼기`}
                        onClick={() => setEditing(editing.filter((x) => x.id !== p.id))}>빼기</button>
              </li>
            ))}
          </ol>
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => saveOrder(editing)}>저장</button>
            <button type="button" className="btn btn-text" onClick={() => { setEditing(null); setError(null) }}>취소</button>
          </div>
        </>
      ) : series.posts.length === 0 ? (
        <p className="muted center">아직 이 시리즈에 발행한 글이 없어요. 글쓰기 화면의 [시리즈]에서 넣을 수 있어요.</p>
      ) : (
        <ol className="series-posts">
          {series.posts.map((p, i) => (
            <li key={p.id}>
              <span className="series-no" aria-hidden="true">{i + 1}.</span>
              <PostCard card={p} showAuthor={false} />
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}

/** 블로그의 [시리즈] 탭 (024 US2-2). 남에게는 읽을 수 있는 글이 있는 시리즈만 온다. */
export function BlogSeries({ handle, mine }: { handle: string; mine: boolean }) {
  const [list, setList] = useState<Awaited<ReturnType<typeof seriesApi.list>> | null>(null)
  useEffect(() => {
    let alive = true
    seriesApi.list(handle).then((l) => { if (alive) setList(l) }).catch(() => { if (alive) setList([]) })
    return () => { alive = false }
  }, [handle])
  if (!list) return <p className="muted center">불러오는 중…</p>
  if (list.length === 0) {
    return <p className="muted center">{mine ? '아직 시리즈가 없어요. 글쓰기 화면의 [시리즈]에서 만들 수 있어요.' : '아직 시리즈가 없어요.'}</p>
  }
  return (
    <div className="card-grid">
      {list.map((s) => (
        <article key={s.id} className="card">
          <Link to={seriesPath(handle, s.slug)} className="card-thumb" tabIndex={-1} aria-hidden="true">
            {s.thumbnailUrl ? <img src={s.thumbnailUrl} alt="" loading="lazy" /> : <span className="card-thumb-empty" />}
          </Link>
          <div className="card-body">
            <h2 className="card-title"><Link to={seriesPath(handle, s.slug)}>{s.name}</Link></h2>
            <div className="card-meta">
              글 {s.postCount}개 · <time dateTime={s.updatedAt}>{relativeDate(s.updatedAt)} 수정</time>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
