import { Feed } from '../components/Feed'
import { takeInitialData } from '../lib/api'
import { loginPath, useAuth } from '../lib/auth'
import { Link } from '../lib/router'
import type { FeedPage } from '../lib/types'

export function HomePage() {
  const initial = takeInitialData<{ feed: FeedPage }>('home')?.feed ?? null
  const { me } = useAuth()
  return (
    <main className="container">
      <h1 className="page-title">최신 글</h1>
      <Feed endpoint="/api/posts" storageKey="feed:home" initial={initial} empty={
        <>
          <p>아직 올라온 글이 없어요. 첫 글의 주인공이 되어 보세요.</p>
          {me?.authenticated ? <Link to="/write" className="btn btn-primary">글쓰기</Link>
            : <Link to={loginPath('/write')} className="btn btn-primary">로그인</Link>}
        </>
      } />
    </main>
  )
}
