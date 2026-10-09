import { useEffect, useState } from 'react'
import { takeInitialData } from '../lib/api'
import { Link } from '../lib/router'
import { tagPath, tagsApi, type TagCount } from '../lib/tags'

/** 전체 태그 목록: 공개 글 수 많은 순 상위 100개 (010 FR-023). */
export function TagsPage() {
  const initial = takeInitialData<{ tags: TagCount[] }>('tags')?.tags ?? null
  const [tags, setTags] = useState<TagCount[] | null>(initial)
  const [error, setError] = useState(false)

  const load = () => {
    setError(false)
    tagsApi.top().then(setTags).catch(() => setError(true))
  }
  useEffect(() => {
    if (!initial) load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="container">
      <h1 className="page-title">태그</h1>
      {error && <p className="feed-error" role="alert">불러오지 못했어요 <button type="button" className="btn btn-text" onClick={load}>다시 시도</button></p>}
      {!error && !tags && <p className="muted center">불러오는 중…</p>}
      {tags && tags.length === 0 && <div className="empty"><p>아직 태그가 없어요.</p></div>}
      {tags && tags.length > 0 && (
        <ul className="tag-cloud">
          {tags.map((t) => (
            <li key={t.name}><Link to={tagPath(t.name)} className="tag-link">#{t.name} <span className="muted">{t.postCount}</span></Link></li>
          ))}
        </ul>
      )}
    </main>
  )
}
