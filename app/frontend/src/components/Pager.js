import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { pageCount } from '../lib/admin';
import { t } from '../lib/i18n';
/** 관리자 목록의 쪽 넘기기 (062). 한 쪽뿐이면 그리지 않는다. */
export function Pager({ page, total, pageSize, onPage }) {
    const last = pageCount(total, pageSize);
    if (last <= 1)
        return null;
    return (_jsxs("nav", { className: "pager", "aria-label": t('쪽 넘기기'), children: [_jsx("button", { type: "button", className: "btn btn-outline", disabled: page <= 1, onClick: () => onPage(page - 1), "data-tip": t('앞 쪽'), children: t('이전') }), _jsx("span", { className: "muted small", "aria-current": "page", children: t('{0} / {1}쪽', { 0: page, 1: last }) }), _jsx("button", { type: "button", className: "btn btn-outline", disabled: page >= last, onClick: () => onPage(page + 1), "data-tip": t('다음 쪽'), children: t('다음') })] }));
}
