import { pageCount } from '../lib/admin'
import { t } from '../lib/i18n'

/** 관리자 목록의 쪽 넘기기 (062). 한 쪽뿐이면 그리지 않는다. */
export function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const last = pageCount(total, pageSize)
  if (last <= 1) return null
  return (
    <nav className="pager" aria-label={t('쪽 넘기기')}>
      <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)} data-tip={t('앞 쪽')}>{t('이전')}</button>
      <span className="muted small" aria-current="page">{t('{0} / {1}쪽', { 0: page, 1: last })}</span>
      <button type="button" className="btn btn-outline" disabled={page >= last} onClick={() => onPage(page + 1)} data-tip={t('다음 쪽')}>{t('다음')}</button>
    </nav>
  )
}
