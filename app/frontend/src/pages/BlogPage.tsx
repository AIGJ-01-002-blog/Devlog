import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Feed } from '../components/Feed'
import { api, ApiError, takeInitialData } from '../lib/api'
import { loginPath, useAuth } from '../lib/auth'
import { friendsApi, lastActiveLabel } from '../lib/friends'
import { Link, navigate } from '../lib/router'
import type { BlogProfile, FeedPage, FriendRelation } from '../lib/types'
import { NotFoundPage } from './NotFoundPage'

export function BlogPage({ handle }: { handle: string }) {
  const initial = takeInitialData<{ profile: BlogProfile; feed: FeedPage }>('blog')
  const [profile, setProfile] = useState<BlogProfile | null>(initial?.profile.handle === handle ? initial.profile : null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (profile?.handle === handle) return
    api<BlogProfile>(`/api/members/${encodeURIComponent(handle)}`)
      .then(setProfile)
      .catch((e) => { if (e instanceof ApiError && e.status === 404) setMissing(true) })
  }, [handle, profile])

  if (missing) return <NotFoundPage />
  if (!profile) return <main className="container"><p className="muted center">불러오는 중…</p></main>
  return (
    <main className="container">
      <header className="blog-profile">
        <Avatar src={profile.profileImageUrl} name={profile.nickname} seed={profile.handle} size={96} />
        <div>
          <h1>{profile.nickname}</h1>
          <p className="muted">@{profile.handle}</p>
          {profile.bio && <p className="bio">{profile.bio}</p>}
          <p className="muted small">
            글 {profile.publicPostCount}개
            {lastActiveLabel(profile.lastActiveDaysAgo) && <> · 최근 활동 {lastActiveLabel(profile.lastActiveDaysAgo)}</>}
          </p>
          {!profile.mine && <FriendButton profile={profile} onChange={(f) => {
            setProfile({ ...profile, friendship: f, lastActiveDaysAgo: null })
            // 친구가 되면 최근 활동을 다시 받아 온다 (서버가 조건을 판단한다)
            if (f === 'FRIENDS') void api<BlogProfile>(`/api/members/${encodeURIComponent(handle)}`).then(setProfile).catch(() => {})
          }} />}
        </div>
      </header>
      <Feed endpoint={`/api/members/${encodeURIComponent(handle)}/posts`} storageKey={`feed:blog:${handle}`}
            initial={initial?.profile.handle === handle ? initial.feed : null} showAuthor={false}
            empty={profile.mine
              ? <><p>아직 공개한 글이 없어요.</p><Link to="/write" className="btn btn-primary">첫 글 쓰기</Link></>
              : <p>아직 공개한 글이 없어요.</p>} />
    </main>
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
