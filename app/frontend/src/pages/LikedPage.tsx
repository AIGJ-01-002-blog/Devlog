import { useEffect } from 'react'
import { Feed } from '../components/Feed'
import { Link } from '../lib/router'
import { t } from '../lib/i18n'

/** 좋아한 글 /lists/liked (027). 좋아요를 누른 최근 순, 지금 읽을 수 있는 글만. */
export function LikedPage() {
  useEffect(() => { document.title = t('좋아한 글 - devlog') }, [])
  return (
    <main className="container">
      <h1 className="page-title">{t('좋아한 글')}</h1>
      <Feed endpoint="/api/me/liked-posts" storageKey="feed:liked" initial={null}
            empty={<><p>{t('아직 좋아요를 누른 글이 없어요')}</p><Link to="/" className="btn btn-primary">{t('홈에서 글 찾기')}</Link></>} />
    </main>
  )
}
