import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Feed } from '../components/Feed'
import { api, ApiError, takeInitialData } from '../lib/api'
import { Link } from '../lib/router'
import type { BlogProfile, FeedPage } from '../lib/types'
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
        <Avatar src={profile.profileImageUrl} name={profile.nickname} size={96} />
        <div>
          <h1>{profile.nickname}</h1>
          <p className="muted">@{profile.handle}</p>
          {profile.bio && <p className="bio">{profile.bio}</p>}
          <p className="muted small">글 {profile.publicPostCount}개</p>
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
