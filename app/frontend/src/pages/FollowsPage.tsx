import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { InfiniteLoader } from '../components/InfiniteLoader'
import { FollowButton } from '../components/FollowButton'
import { ApiError, api, takeInitialData } from '../lib/api'
import { HIDDEN_FOLLOW_TEXT, appendPeople, emptyFollowText, followApi, type FollowDirection, type FollowPage, type FollowPerson } from '../lib/follow'
import { Link } from '../lib/router'
import type { BlogProfile } from '../lib/types'
import { NotFoundPage } from './NotFoundPage'
import { t, tNodes } from '../lib/i18n'

/**
 * 팔로워·팔로잉 목록 (016 US3): 최근에 팔로우한 순 20개씩 무한 스크롤(spec 069), 보는 사람 기준 팔로우 버튼. 비회원도 본다.
 * 주인이 목록을 비공개로 두면 본인·관리자 말고는 "비공개 계정입니다"만 보인다(spec 079). 탭의 수는 그대로다.
 */
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
  const [hidden, setHidden] = useState(initial?.follows.hidden === true)

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
      // 보는 사이에 비공개로 바뀌면 이미 받은 사람도 지운다 (079)
      setPeople((prev) => (page.hidden ? [] : from ? appendPeople(prev, page.items) : page.items))
      setCursor(page.hidden ? null : page.nextCursor)
      setHidden(page.hidden === true)
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
    if (profile) document.title = t('{0}님의 {1} - devlog', { 0: profile.nickname, 1: direction === 'followers' ? t('팔로워') : t('팔로잉') })
  }, [profile, direction])

  if (missing) return <NotFoundPage />
  const who = profile ? <Link to={`/@${handle}`}>{profile.nickname}</Link> : '…'
  return (
    <main className="container narrow">
      <h1 className="page-title">
        {direction === 'followers'
          ? tNodes('{0}님의 팔로워', { 0: who })
          : tNodes('{0}님이 팔로우하는 사람', { 0: who })}
      </h1>
      <nav className="tabs follow-tabs" aria-label={t('팔로워·팔로잉')}>
        <Link to={`/@${handle}/followers`} aria-current={direction === 'followers' ? 'page' : undefined}>
          
          {t('팔로워')}{profile && ` ${profile.followerCount}`}
        </Link>
        <Link to={`/@${handle}/following`} aria-current={direction === 'following' ? 'page' : undefined}>
          
          {t('팔로잉')}{profile && ` ${profile.followingCount}`}
        </Link>
      </nav>
      {loaded && hidden && (
        <div className="follow-hidden center" role="status">
          <span className="follow-hidden-icon" aria-hidden="true">🔒</span>
          <p><b>{HIDDEN_FOLLOW_TEXT}</b></p>
          <p className="muted small">{t('이 회원은 팔로워·팔로잉 목록을 공개하지 않았어요.')}</p>
        </div>
      )}
      {loaded && !hidden && people.length === 0 && !error && <p className="muted center empty">{emptyFollowText(direction)}</p>}
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
      {loading && cursor == null && <p className="muted center">{t('불러오는 중…')}</p>}
      <InfiniteLoader hasMore={cursor != null} loading={loading} failed={error}
        onMore={() => void more(cursor)} />
    </main>
  )
}
