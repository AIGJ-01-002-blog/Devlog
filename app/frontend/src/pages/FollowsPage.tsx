import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { FollowButton } from '../components/FollowButton'
import { ApiError, api, takeInitialData } from '../lib/api'
import { appendPeople, emptyFollowText, followApi, type FollowDirection, type FollowPage, type FollowPerson } from '../lib/follow'
import { Link } from '../lib/router'
import type { BlogProfile } from '../lib/types'
import { NotFoundPage } from './NotFoundPage'

/** 팔로워·팔로잉 목록 (016 US3): 최근에 팔로우한 순 20개씩 [더 보기], 보는 사람 기준 팔로우 버튼. 비회원도 본다. */
export function FollowsPage({ handle, direction }: { handle: string; direction: FollowDirection }) {
  const [initial] = useState(() => {
    const d = takeInitialData<{ profile: BlogProfile; follows: FollowPage }>('follows')
    return d?.profile.handle === handle ? d : null
  })
  const [profile, setProfile] = useState<BlogProfile | null>(initial?.profile ?? null)
  const [people, setPeople] = useState<FollowPerson[]>(initial?.follows.items ?? [])
  const [cursor, setCursor] = useState<string | null>(initial?.follows.nextCursor ?? null)
  const [loaded, setLoaded] = useState(initial != null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (profile) return
    api<BlogProfile>(`/api/members/${encodeURIComponent(handle)}`).then(setProfile)
      .catch((e) => { if (e instanceof ApiError && e.status === 404) setMissing(true) })
  }, [handle, profile])

  const more = async (from: string | null) => {
    setLoading(true)
    setError(false)
    try {
      const page = await followApi.list(handle, direction, from)
      setPeople((prev) => (from ? appendPeople(prev, page.items) : page.items))
      setCursor(page.nextCursor)
      setLoaded(true)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMissing(true)
      else setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!loaded) void more(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (profile) document.title = `${profile.nickname}님의 ${direction === 'followers' ? '팔로워' : '팔로잉'} - devlog`
  }, [profile, direction])

  if (missing) return <NotFoundPage />
  return (
    <main className="container narrow">
      <h1 className="page-title">
        {profile ? <Link to={`/@${handle}`}>{profile.nickname}</Link> : '…'}
        {direction === 'followers' ? '님의 팔로워' : '님이 팔로우하는 사람'}
      </h1>
      <nav className="tabs follow-tabs" aria-label="팔로워·팔로잉">
        <Link to={`/@${handle}/followers`} aria-current={direction === 'followers' ? 'page' : undefined}>
          팔로워{profile && ` ${profile.followerCount}`}
        </Link>
        <Link to={`/@${handle}/following`} aria-current={direction === 'following' ? 'page' : undefined}>
          팔로잉{profile && ` ${profile.followingCount}`}
        </Link>
      </nav>
      {loaded && people.length === 0 && !error && <p className="muted center empty">{emptyFollowText(direction)}</p>}
      {people.length > 0 && (
        <ul className="person-list">
          {people.map((p) => (
            <li key={p.id} className="person-row">
              <Link to={`/@${p.handle}`} className="person-who">
                <Avatar src={p.profileImageUrl} name={p.nickname} seed={p.handle} size={40} />
                <span>
                  <b>{p.nickname}</b> <span className="muted small">@{p.handle}</span>
                  {p.bioFirstLine && <span className="person-bio muted small">{p.bioFirstLine}</span>}
                </span>
              </Link>
              {!p.me && <FollowButton handle={p.handle} following={p.following} small />}
            </li>
          ))}
        </ul>
      )}
      {loading && <p className="muted center">불러오는 중…</p>}
      {error && (
        <p className="error center" role="alert">목록을 불러오지 못했어요 <button type="button" className="btn btn-text" onClick={() => more(cursor)}>다시 시도</button></p>
      )}
      {!loading && !error && cursor && (
        <div className="center"><button type="button" className="btn btn-outline" onClick={() => more(cursor)}>더 보기</button></div>
      )}
    </main>
  )
}
