import { cappedCount, fullDate, relativeDate } from '../lib/format'
import { Link } from '../lib/router'
import { tagPath } from '../lib/tags'
import type { Card } from '../lib/types'
import { VISIBILITY_ICON, VISIBILITY_LABEL } from '../lib/visibility'
import { Avatar } from './Avatar'
import { NavIcon } from './NavIcons'

/** 표지 색 번호(0~3). 같은 글은 언제나 같은 색이다. */
export function coverTone(id: number): number {
  return ((id % 4) + 4) % 4
}

/** 표지에 크게 올릴 제목 첫 글자. 이모지·한글도 한 글자로 센다. */
export function coverGlyph(title: string): string {
  return Array.from(title.trim())[0]?.toUpperCase() ?? '#'
}

/** 카드에 보이는 태그 수. 넘치면 …로 줄이고 나머지는 툴팁으로 보인다 */
export const CARD_TAG_LIMIT = 3

/** 홈·블로그 카드. 썸네일이 없어도 높이가 같고, 요약은 짧아도 3줄 높이다 (docs/10 §2). */
export function PostCard({ card, showAuthor = true }: { card: Card; showAuthor?: boolean }) {
  return (
    <article className="card">
      <Link to={card.url} className="card-thumb" tabIndex={-1} aria-hidden="true">
        {card.thumbnailUrl ? <img src={card.thumbnailUrl} alt="" width={640} height={360} loading="lazy" /> : (
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
        <CardTags tags={card.tags ?? []} />
        <div className="card-meta">
          {card.similar && (
            // 하이브리드 검색(054)에서 의미로만 찾은 글. 검색어 강조가 없는 이유를 알려 준다
            <><span className="badge badge-similar" title="검색어가 그대로 들어 있지 않지만 내용이 비슷해 찾은 글이에요">비슷한 글</span>{' · '}</>
          )}
          {card.visibility === 'FRIENDS' && (
            <><span className="badge" title="친구에게만 보이는 글">{VISIBILITY_ICON.FRIENDS} {VISIBILITY_LABEL.FRIENDS}</span>{' · '}</>
          )}
          <time dateTime={card.firstPublicAt ?? card.publishedAt} title={fullDate(card.firstPublicAt ?? card.publishedAt)}>{relativeDate(card.firstPublicAt ?? card.publishedAt)}</time>
        </div>
      </div>
      {showAuthor && (
        <footer className="card-footer">
          <Link to={`/@${card.author.handle}`} className="card-author">
            <Avatar src={card.author.profileImageUrl} name={card.author.nickname} seed={card.author.handle} size={24} />
            <span>by <b>{card.author.nickname}</b></span>
          </Link>
          <CardStats card={card} />
        </footer>
      )}
    </article>
  )
}

export function CardTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  const rest = tags.slice(CARD_TAG_LIMIT)
  return (
    <ul className="card-tags" aria-label="태그">
      {tags.slice(0, CARD_TAG_LIMIT).map((t) => (
        <li key={t}><Link to={tagPath(t)} className="card-tag" data-tip={`#${t} 태그 글 보기`}>#{t}</Link></li>
      ))}
      {rest.length > 0 && (
        <li className="card-tag-more" tabIndex={0} aria-label={`태그 ${rest.length}개 더: ${rest.join(', ')}`}
            data-tip={rest.map((t) => `#${t}`).join(' ')}>…</li>
      )}
    </ul>
  )
}

/** 조회·댓글·좋아요. 99를 넘으면 99+로 줄이고, 정확한 수는 툴팁으로 보인다 */
export function CardStats({ card }: { card: Card }) {
  const views = card.viewCount ?? 0
  const items = [
    { key: 'view', icon: 'eye', label: '조회', n: views, unit: '회' },
    { key: 'comment', icon: 'comment', label: '댓글', n: card.commentCount, unit: '개' },
    { key: 'like', icon: 'heart', label: '좋아요', n: card.likeCount, unit: '개' },
  ] as const
  return (
    <span className="card-stats">
      {items.map((it) => (
        <span key={it.key} className={`card-stat card-${it.key}`} data-tip={`${it.label} ${it.n.toLocaleString('ko-KR')}${it.unit}`}>
          <span aria-hidden="true"><NavIcon name={it.icon} size={14} />{cappedCount(it.n)}</span>
          <span className="sr-only">{it.label} {it.n.toLocaleString('ko-KR')}{it.unit}</span>
        </span>
      ))}
    </span>
  )
}
