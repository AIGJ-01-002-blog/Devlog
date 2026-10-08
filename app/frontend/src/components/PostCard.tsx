import { relativeDate } from '../lib/format'
import { Link } from '../lib/router'
import type { Card } from '../lib/types'
import { VISIBILITY_ICON, VISIBILITY_LABEL } from '../lib/visibility'
import { Avatar } from './Avatar'

/** 표지 색 번호(0~3). 같은 글은 언제나 같은 색이다. */
export function coverTone(id: number): number {
  return ((id % 4) + 4) % 4
}

/** 표지에 크게 올릴 제목 첫 글자. 이모지·한글도 한 글자로 센다. */
export function coverGlyph(title: string): string {
  return Array.from(title.trim())[0]?.toUpperCase() ?? '#'
}

/** 홈·블로그 카드. 썸네일이 없어도 높이가 같고, 요약은 짧아도 3줄 높이다 (docs/10 §2). */
export function PostCard({ card, showAuthor = true }: { card: Card; showAuthor?: boolean }) {
  return (
    <article className="card">
      <Link to={card.url} className="card-thumb" tabIndex={-1} aria-hidden="true">
        {card.thumbnailUrl ? <img src={card.thumbnailUrl} alt={card.title} loading="lazy" /> : (
          // 사진이 없으면 글마다 정해진 그라데이션 위에 제목 첫 글자를 크게 올린 표지 (048)
          <span className="card-thumb-empty card-cover" data-tone={coverTone(card.id)}>
            <span className="card-cover-mark">devlog/@{card.author.handle}</span>
            <span className="card-cover-glyph">{coverGlyph(card.title)}</span>
          </span>
        )}
      </Link>
      <div className="card-body">
        <h2 className="card-title"><Link to={card.url}>{card.title}</Link></h2>
        {card.snippetHtml != null
          // 서버가 전부 이스케이프하고 검색어에만 <mark>를 붙인 문장이다 (014 FR-019)
          ? <p className="card-excerpt card-snippet" dangerouslySetInnerHTML={{ __html: card.snippetHtml }} />
          : <p className="card-excerpt">{card.excerpt ?? ''}</p>}
        <div className="card-meta">
          {card.visibility === 'FRIENDS' && (
            <><span className="badge" title="친구에게만 보이는 글">{VISIBILITY_ICON.FRIENDS} {VISIBILITY_LABEL.FRIENDS}</span>{' · '}</>
          )}
          <time dateTime={card.firstPublicAt ?? card.publishedAt}>{relativeDate(card.firstPublicAt ?? card.publishedAt)}</time>
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
