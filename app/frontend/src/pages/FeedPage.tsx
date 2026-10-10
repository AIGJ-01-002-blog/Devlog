import { useEffect, useState } from 'react'
import { Feed } from '../components/Feed'
import { FEED_ENDPOINT, type FollowFeedPage } from '../lib/follow'
import { Link } from '../lib/router'
import { t } from '../lib/i18n'

/** 팔로잉 피드 (016 US2): 팔로우한 사람의 공개 글을 홈과 같은 카드·정렬로 9개씩. 로그인 필요. */
export function FeedPage() {
  const [followsAnyone, setFollowsAnyone] = useState<boolean | null>(null)
  useEffect(() => { document.title = t('피드 - devlog') }, [])
  return (
    <main className="container">
      <h1 className="page-title">{t('피드')}</h1>
      <Feed endpoint={FEED_ENDPOINT} storageKey="feed:following" initial={null}
            onFirstPage={(p) => setFollowsAnyone((p as FollowFeedPage).followsAnyone ?? null)}
            empty={followsAnyone === false
              ? <><p>{t('팔로우한 사람이 없어요. 홈에서 읽고 싶은 블로그를 찾아보세요')}</p><Link to="/" className="btn btn-primary">{t('홈')}</Link></>
              : <p>{t('팔로우한 사람의 공개 글이 아직 없어요')}</p>} />
    </main>
  )
}
