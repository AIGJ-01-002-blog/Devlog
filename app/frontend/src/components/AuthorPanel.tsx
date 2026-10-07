import { fullDate } from '../lib/format'
import { suspensionPeriod, type AuthorInfo } from '../lib/moderation'
import { Link } from '../lib/router'

/** 작성자 정보 (019 FR-013): 가입일·숨겨진 콘텐츠 수·정지 이력 */
export function AuthorPanel({ author, linkToMember = true }: { author: AuthorInfo; linkToMember?: boolean }) {
  return (
    <section className="admin-section">
      <h2>작성자</h2>
      <p>
        {linkToMember ? <Link to={`/admin/members/${author.handle}`}>@{author.handle}</Link> : <b>@{author.handle}</b>}
        {author.nickname && <> · {author.nickname}</>}
        {author.admin && <span className="badge"> 관리자</span>}
        {author.suspended && <span className="badge badge-warn"> 정지 중</span>}
      </p>
      <p className="muted small">가입 {fullDate(author.joinedAt)} · 숨겨진 글·댓글 {author.hiddenCount}개</p>
      {author.suspensions.length > 0 ? (
        <ul className="suspension-history">
          {author.suspensions.map((s) => (
            <li key={s.id}><span className="muted small">{suspensionPeriod(s, fullDate)}</span> · {s.reason}</li>
          ))}
        </ul>
      ) : <p className="muted small">정지 이력 없음</p>}
    </section>
  )
}
