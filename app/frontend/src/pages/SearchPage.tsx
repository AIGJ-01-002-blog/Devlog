import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Feed } from '../components/Feed'
import { SearchBox } from '../components/SearchBox'
import { takeInitialData } from '../lib/api'
import { Link, navigate, useLocation } from '../lib/router'
import {
  emptyMessage, hasShortWord, NOTICE_TEXT, parseSort, postsEndpoint, searchApi, searchPath,
  type PeoplePage, type SearchPostPage, type SearchSort, type SearchTab,
} from '../lib/search'
import type { FeedPage } from '../lib/types'
import { t } from '../lib/i18n'

/** 검색 (spec 014): 글 탭(관련도순·최신순, 9개씩 [더 보기])과 사람 탭. 서버 화면은 수집 거부(noindex)다. */
export function SearchPage() {
  const { search } = useLocation()
  const q = (search.get('q') ?? '').trim()
  const tab: SearchTab = search.get('tab') === 'people' ? 'people' : 'posts'
  const sort = parseSort(search.get('sort'))
  const [initial] = useState(() => takeInitialData<{ result?: SearchPostPage }>('search')?.result ?? null)

  useEffect(() => {
    document.title = q ? t('\'{0}\' 검색 - devlog', { 0: q }) : t('검색 - devlog')
  }, [q])

  const go = (nq: string, ntab: SearchTab = tab, nsort: SearchSort = sort) => navigate(searchPath(nq, ntab, nsort))
  return (
    <main className="container">
      <h1 className="sr-only">{t('검색')}</h1>
      <SearchBox initial={q} placeholder={t('글·태그·사람 검색')} autoFocus={!q} onSearch={(nq) => go(nq)} />
      {q && (
        <>
          <div className="search-head">
            <div className="tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'posts'} onClick={() => go(q, 'posts')}>{t('글')}</button>
              <button type="button" role="tab" aria-selected={tab === 'people'} onClick={() => go(q, 'people')}>{t('사람')}</button>
            </div>
            {tab === 'posts' && (
              <select aria-label={t('정렬')} value={sort} onChange={(e) => go(q, 'posts', e.target.value as SearchSort)}>
                <option value="relevance">{t('관련도순')}</option>
                <option value="latest">{t('최신순')}</option>
              </select>
            )}
          </div>
          {tab === 'posts'
            ? <PostResults key={`${q}|${sort}`} q={q} sort={sort} initial={initial?.query === q && sort === 'relevance' ? initial : null} />
            : <PeopleResults key={q} q={q} />}
        </>
      )}
    </main>
  )
}

/** 글 결과. 블로그 안 검색(blog)도 같은 목록을 쓴다. */
export function PostResults({ q, sort, initial, blog }: { q: string; sort: SearchSort; initial: SearchPostPage | null; blog?: string }) {
  const [notice, setNotice] = useState(initial?.notice ?? (hasShortWord(q) ? 'TWO_CHAR_TITLE_TAG_ONLY' : null))
  if (notice === 'TOO_SHORT') return <p className="search-notice" role="status">{NOTICE_TEXT.TOO_SHORT}</p>
  return (
    <>
      {notice && <p className="search-notice" role="status">{NOTICE_TEXT[notice]}</p>}
      <Feed endpoint={postsEndpoint(q, sort, blog)} storageKey={`feed:search:${blog ?? ''}:${sort}:${q}`}
            initial={initial as unknown as FeedPage | null} showAuthor={!blog}
            onFirstPage={(p) => setNotice((p as unknown as SearchPostPage).notice)}
            empty={<p>{emptyMessage(q)}{notice === 'TWO_CHAR_TITLE_TAG_ONLY' ? ` (${NOTICE_TEXT.TWO_CHAR_TITLE_TAG_ONLY})` : ''}</p>} />
    </>
  )
}

function PeopleResults({ q }: { q: string }) {
  const [page, setPage] = useState<PeoplePage | null>(null)
  const [error, setError] = useState(false)
  const load = () => {
    setError(false)
    searchApi.people(q).then(setPage).catch(() => setError(true))
  }
  useEffect(load, [q])
  if (error) return <p className="feed-error" role="alert">{t('불러오지 못했어요')} <button type="button" className="btn btn-text" onClick={load}>{t('다시 시도')}</button></p>
  if (!page) return <p className="muted center">{t('불러오는 중…')}</p>
  if (page.notice === 'TOO_SHORT') return <p className="search-notice" role="status">{NOTICE_TEXT.TOO_SHORT}</p>
  if (page.items.length === 0) return <div className="empty"><p>{t('\'{0}\'에 해당하는 사람이 없어요', { 0: q })}</p></div>
  return (
    <ul className="people-list">
      {page.items.map((p) => (
        <li key={p.id}>
          <Link to={`/@${p.handle}`} className="person">
            <Avatar src={p.profileImageUrl} name={p.nickname} seed={p.handle} size={48} />
            <span>
              <b>{p.nickname}</b> <span className="muted">@{p.handle}</span>
              {p.bioFirstLine && <span className="person-bio muted">{p.bioFirstLine}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
