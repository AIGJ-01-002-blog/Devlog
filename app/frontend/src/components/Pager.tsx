import { pageCount } from '../lib/admin'

/** 관리자 목록의 쪽 넘기기 (062). 한 쪽뿐이면 그리지 않는다. */
export function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const last = pageCount(total, pageSize)
  if (last <= 1) return null
  return (
    <nav className="pager" aria-label="쪽 넘기기">
      <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)} data-tip="앞 쪽">이전</button>
      <span className="muted small" aria-current="page">{page} / {last}쪽</span>
      <button type="button" className="btn btn-outline" disabled={page >= last} onClick={() => onPage(page + 1)} data-tip="다음 쪽">다음</button>
    </nav>
  )
}
