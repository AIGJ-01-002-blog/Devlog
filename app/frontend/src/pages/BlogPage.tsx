import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Feed } from '../components/Feed'
import { FollowButton } from '../components/FollowButton'
import { SearchBox } from '../components/SearchBox'
import { SocialLinkList } from '../components/SocialLinkList'
import { parseSort } from '../lib/search'
import { PostResults } from './SearchPage'
import { api, ApiError, takeInitialData } from '../lib/api'
import { loginPath, useAuth } from '../lib/auth'
import { friendsApi, lastActiveLabel } from '../lib/friends'
import { Link, navigate, useLocation } from '../lib/router'
import { blogTagPath, normalizeTag, tagFormatError, tagsApi, type TagCount } from '../lib/tags'
import type { BlogProfile, FeedPage, FriendRelation } from '../lib/types'
import { NotFoundPage } from './NotFoundPage'
import { BlogSeries } from './SeriesPage'
import { BlogAbout } from '../components/BlogAbout'
import { NavIcon } from '../components/NavIcons'
import { avatarColor, AVATAR_COLORS } from '../lib/avatar'
import { compactNumber } from '../lib/format'

/** 블로그 표지 색(0~3). 같은 블로그는 언제나 같은 색이다. */
export function blogTone(handle: string): number {
  return AVATAR_COLORS.indexOf(avatarColor(handle) as (typeof AVATAR_COLORS)[number]) % 4
}

/** tab: 블로그 글 목록(기본), [시리즈] 탭 (024), [소개] 탭 (042) */
export function BlogPage({ handle, tab = 'posts' }: { handle: string; tab?: 'posts' | 'series' | 'about' }) {
  const [initial] = useState(() => takeInitialData<{ profile: BlogProfile; feed: FeedPage; blogTags: TagCount[]; tag?: string }>('blog'))
  const [profile, setProfile] = useState<BlogProfile | null>(initial?.profile.handle === handle ? initial.profile : null)
  const [missing, setMissing] = useState(false)
  const { search } = useLocation()
  const rawTag = search.get('tag')
  const tag = rawTag ? normalizeTag(rawTag) : null
  const badTag = tag != null && tagFormatError(tag) != null
  const q = (search.get('q') ?? '').trim()
  const searchIn = (nq: string) => navigate(`/@${handle}?q=${encodeURIComponent(nq)}`)

  useEffect(() => {
    // 정규화되지 않은 필터 값은 정규화된 주소로 바꾼다 (서버는 301)
    if (tag && !badTag && tag !== rawTag) navigate(blogTagPath(handle, tag), { replace: true })
  }, [tag, rawTag, badTag, handle])

  useEffect(() => {
    if (profile?.handle === handle) return
    api<BlogProfile>(`/api/members/${encodeURIComponent(handle)}`)
      .then(setProfile)
      .catch((e) => { if (e instanceof ApiError && e.status === 404) setMissing(true) })
  }, [handle, profile])

  if (missing || badTag) return <NotFoundPage />
  if (!profile) return <main className="container"><p className="muted center">불러오는 중…</p></main>
  return (
    <main className="container">
      <header className="blog-hero">
        <div className="blog-cover" data-tone={blogTone(profile.handle)} aria-hidden="true" />
        <div className="blog-hero-body">
          <div className="blog-hero-top">
            <span className="blog-avatar"><Avatar src={profile.profileImageUrl} name={profile.nickname} seed={profile.handle} size={112} /></span>
            <div className="blog-hero-actions">
              <Link to={`/@${profile.handle}/rss`} className="btn btn-outline btn-icon" aria-label="RSS 구독"
                    data-tip="RSS 구독: 구독 앱으로 이 블로그의 새 글 받기"><NavIcon name="rss" /></Link>
              {profile.mine ? <>
                <Link to="/settings#profile" className="btn btn-outline" data-tip="사진·닉네임·소개 바꾸기">프로필 편집</Link>
                <Link to="/manage/posts" className="btn btn-outline" data-tip="임시글·발행 글·휴지통 관리">글 관리</Link>
                <Link to="/write" className="btn btn-primary" data-tip="새 글 쓰기"><NavIcon name="pen" size={16} />새 글</Link>
              </> : <>
                <FriendButton profile={profile} onChange={(f) => {
                  setProfile((p) => p && { ...p, friendship: f, lastActiveDaysAgo: null })
                  // 친구가 되면 최근 활동을 다시 받아 온다 (서버가 조건을 판단한다)
                  if (f === 'FRIENDS') void api<BlogProfile>(`/api/members/${encodeURIComponent(handle)}`).then(setProfile).catch(() => {})
                }} />
                <FollowButton handle={profile.handle} following={profile.following}
                  onChange={(st) => setProfile((p) => p && { ...p, following: st.following, followerCount: st.followerCount })} />
              </>}
            </div>
          </div>
          <h1 className="blog-name">{profile.nickname}</h1>
          <p className="blog-handle muted">@{profile.handle}
            {lastActiveLabel(profile.lastActiveDaysAgo) && <span className="blog-active"> · 최근 활동 {lastActiveLabel(profile.lastActiveDaysAgo)}</span>}
          </p>
          {profile.bio && <p className="bio">{profile.bio}</p>}
          <SocialLinkList links={profile.socialLinks} />
          <ul className="blog-stats">
            <li><span className="blog-stat"><b>{compactNumber(profile.publicPostCount)}</b><span>공개 글</span></span></li>
            <li><Link to={`/@${profile.handle}/followers`} className="blog-stat" data-tip="나를 팔로우하는 사람"><b>{compactNumber(profile.followerCount)}</b><span>팔로워</span></Link></li>
            <li><Link to={`/@${profile.handle}/following`} className="blog-stat" data-tip="내가 팔로우하는 사람"><b>{compactNumber(profile.followingCount)}</b><span>팔로잉</span></Link></li>
          </ul>
        </div>
      </header>
      <nav className="blog-tabs" aria-label="블로그 메뉴">
        <Link to={`/@${profile.handle}`} aria-current={tab === 'posts' ? 'page' : undefined}>글</Link>
        <Link to={`/@${profile.handle}/series`} aria-current={tab === 'series' ? 'page' : undefined}>시리즈</Link>
        <Link to={`/@${profile.handle}/about`} aria-current={tab === 'about' ? 'page' : undefined}>소개</Link>
      </nav>
      {tab === 'about' ? <BlogAbout handle={profile.handle} /> : tab === 'series' ? <BlogSeries handle={profile.handle} mine={profile.mine} /> : <>
      <SearchBox initial={q} placeholder={`${profile.nickname}님의 글 검색`} onSearch={searchIn} />
      {q ? (
        <>
          <div className="filter-head row">
            <b>'{q}' 검색 결과</b>
            <Link to={`/@${handle}`} className="btn btn-text">검색 해제</Link>
          </div>
          {/* 블로그 안 검색 (014 FR-003): 본인이 봐도 공개 글만 */}
          <PostResults key={q} q={q} sort={parseSort(search.get('sort'))} initial={null} blog={handle} />
        </>
      ) : <>
      <BlogTags handle={handle} initial={initial?.profile.handle === handle ? initial.blogTags : null} active={tag} />
      <Feed key={tag ?? ''} showAuthor={false}
            endpoint={`/api/members/${encodeURIComponent(handle)}/posts${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`}
            storageKey={`feed:blog:${handle}${tag ? `:tag:${tag}` : ''}`}
            initial={initial?.profile.handle === handle && (initial.tag ?? null) === tag ? initial.feed : null}
            empty={tag ? <p>이 태그로 공개한 글이 없어요.</p> : profile.mine
              ? <><p>아직 공개한 글이 없어요.</p><Link to="/write" className="btn btn-primary">첫 글 쓰기</Link></>
              : <p>아직 공개한 글이 없어요.</p>} />
      </>}
      </>}
    </main>
  )
}

/** 블로그 태그 줄과 필터 머리 (010 FR-030·FR-031): 공개 글의 태그, 글 수 많은 순 처음 10개 + [태그 더 보기]. */
function BlogTags({ handle, initial, active }: { handle: string; initial: TagCount[] | null; active: string | null }) {
  const [tags, setTags] = useState<TagCount[] | null>(initial)
  const [all, setAll] = useState(false)
  useEffect(() => {
    if (!initial) tagsApi.blogTags(handle).then(setTags).catch(() => setTags([]))
  }, [handle, initial])
  if (!tags) return null
  const shown = all ? tags : tags.slice(0, 10)
  const activeCount = active ? tags.find((t) => t.name === active)?.postCount ?? 0 : 0
  return (
    <>
      {tags.length > 0 && (
        <nav className="blog-tags" aria-label="이 블로그의 태그">
          {shown.map((t) => (
            <Link key={t.name} to={blogTagPath(handle, t.name)} className={`tag-link${t.name === active ? ' active' : ''}`}
                  aria-current={t.name === active ? 'page' : undefined}>
              #{t.name} <span className="muted">{t.postCount}</span>
            </Link>
          ))}
          {tags.length > 10 && !all && <button type="button" className="btn btn-text" onClick={() => setAll(true)}>태그 더 보기</button>}
        </nav>
      )}
      {active && (
        <div className="filter-head row">
          <b>#{active} 글 {activeCount}개</b>
          <Link to={`/@${handle}`} className="btn btn-text">필터 해제</Link>
        </div>
      )}
    </>
  )
}

/** 친구 요청·수락·취소·끊기 (008 US1). 거절·취소·끊기는 상대에게 알리지 않는다. */
function FriendButton({ profile, onChange }: { profile: BlogProfile; onChange: (f: FriendRelation) => void }) {
  const { me } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const relation = profile.friendship ?? 'NONE'

  const run = async (fn: () => Promise<FriendRelation>) => {
    if (!me?.member) return navigate(loginPath())
    setBusy(true)
    setError(null)
    try {
      onChange(await fn())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '처리하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }
  const removeAs = (next: FriendRelation) => async () => {
    await friendsApi.remove(profile.handle)
    return next
  }

  return (
    <div className="friend-actions row">
      {relation === 'NONE' && (
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(() => friendsApi.request(profile.handle))}>친구 요청</button>
      )}
      {relation === 'SENT' && (
        <>
          <span className="muted small">친구 요청을 보냈어요</span>
          <button type="button" className="btn btn-text" disabled={busy} onClick={() => run(removeAs('NONE'))}>요청 취소</button>
        </>
      )}
      {relation === 'RECEIVED' && (
        <>
          <span className="muted small">나에게 친구 요청을 보냈어요</span>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => friendsApi.accept(profile.handle))}>수락</button>
          <button type="button" className="btn btn-text" disabled={busy} onClick={() => run(removeAs('NONE'))}>거절</button>
        </>
      )}
      {relation === 'FRIENDS' && (
        <>
          <span className="badge">👥 친구</span>
          <button type="button" className="btn btn-text" disabled={busy} onClick={() => {
            if (confirm(`${profile.nickname}님과 친구를 끊을까요? 상대에게 알림은 가지 않아요.`)) void run(removeAs('NONE'))
          }}>친구 끊기</button>
        </>
      )}
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  )
}
