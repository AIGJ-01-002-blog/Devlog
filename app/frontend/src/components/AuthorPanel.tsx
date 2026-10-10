import { fullDate } from '../lib/format'
import { suspensionPeriod, type AuthorInfo } from '../lib/moderation'
import { Link } from '../lib/router'
import { t } from '../lib/i18n'

/** 작성자 정보 (019 FR-013): 가입일·숨겨진 콘텐츠 수·정지 이력 */
export function AuthorPanel({ author, linkToMember = true }: { author: AuthorInfo; linkToMember?: boolean }) {
  return (
    <section className="admin-section">
      <h2>{t('작성자')}</h2>
      <p>
        {linkToMember ? <Link to={`/admin/members/${author.handle}`} className="nowrap">@{author.handle}</Link> : <b className="nowrap">@{author.handle}</b>}
        {author.nickname && <> · {author.nickname}</>}
        {author.admin && <span className="badge"> {author.role === 'MANAGER' ? t('매니저') : t('관리자')}</span>}
        {author.suspended && <span className="badge badge-warn">  {t('정지 중')}</span>}
      </p>
      <p className="muted small">{t('가입 {0} · 숨겨진 글·댓글 {1}개', { 0: fullDate(author.joinedAt), 1: author.hiddenCount })}</p>
      {author.suspensions.length > 0 ? (
        <ul className="suspension-history">
          {author.suspensions.map((s) => (
            <li key={s.id}><span className="muted small">{suspensionPeriod(s, fullDate)}</span> · {s.reason}</li>
          ))}
        </ul>
      ) : <p className="muted small">{t('정지 이력 없음')}</p>}
    </section>
  )
}
