import { useCallback, useEffect, useState } from 'react'
import { Feed } from '../components/Feed'
import { takeInitialData } from '../lib/api'
import { Link, navigate } from '../lib/router'
import { normalizeTag, tagFormatError, tagPath, type TagPageData } from '../lib/tags'
import type { FeedPage } from '../lib/types'
import { NotFoundPage } from './NotFoundPage'
import { t } from '../lib/i18n'

/** 태그별 글 목록 (010 FR-019~FR-022). 공개 글이 없는 태그도 정상 페이지로 빈 상태를 보인다. */
export function TagPage({ name }: { name: string }) {
  const canonical = normalizeTag(name)
  const valid = tagFormatError(canonical) == null
  const initial = takeInitialData<{ tag: TagPageData }>('tag')?.tag
  const first = initial?.name === name ? initial : null
  const [count, setCount] = useState<number | null>(first?.postCount ?? null)
  const onFirstPage = useCallback((p: FeedPage) => setCount((p as TagPageData).postCount), [])

  useEffect(() => {
    // 앱 안에서 정규화되지 않은 주소로 오면 정규화된 주소로 바꾼다 (서버는 301)
    if (valid && canonical !== name) navigate(tagPath(canonical), { replace: true })
  }, [valid, canonical, name])

  if (!valid) return <NotFoundPage />
  if (canonical !== name) return null
  return (
    <main className="container">
      <header className="tag-header">
        <h1 className="page-title">#{name}</h1>
        {count != null && <p className="muted">{t('공개 글')} {count}</p>}
        <Link to="/tags" className="btn btn-text">{t('전체 태그')}</Link>
      </header>
      <Feed endpoint={`/api/tags/${encodeURIComponent(name)}/posts`} storageKey={`feed:tag:${name}`} initial={first}
            onFirstPage={onFirstPage} empty={<p>{t('아직 이 태그로 공개된 글이 없어요.')}</p>} />
    </main>
  )
}
