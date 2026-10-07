import { relativeDate } from '../lib/format'
import { Link } from '../lib/router'
import type { Card } from '../lib/types'
import { Avatar } from './Avatar'

/** 홈·블로그 카드. 썸네일이 없어도 높이가 같고, 요약은 짧아도 3줄 높이다 (docs/10 §2). */
export function PostCard({ card, showAuthor = true }: { card: Card; showAuthor?: boolean }) {
  return (
    <article className="card">
      <Link to={card.url} className="card-thumb" tabIndex={-1} aria-hidden="true">
        {card.thumbnailUrl ? <img src={card.thumbnailUrl} alt={card.title} loading="lazy" /> : <span className="card-thumb-empty" />}
      </Link>
      <div className="card-body">
        <h2 className="card-title"><Link to={card.url}>{card.title}</Link></h2>
        <p className="card-excerpt">{card.excerpt ?? ''}</p>
        <div className="card-meta">
          <time dateTime={card.firstPublicAt}>{relativeDate(card.firstPublicAt)}</time>
          {card.commentCount > 0 && <span> · 댓글 {card.commentCount}</span>}
        </div>
      </div>
      {showAuthor && (
        <footer className="card-footer">
          <Link to={`/@${card.author.handle}`} className="card-author">
            <Avatar src={card.author.profileImageUrl} name={card.author.nickname} seed={card.author.handle} size={24} />
            <span>by <b>{card.author.nickname}</b></span>
          </Link>
          <span className="card-likes" aria-label={`좋아요 ${card.likeCount}`}>♥ {card.likeCount}</span>
        </footer>
      )}
    </article>
  )
}
