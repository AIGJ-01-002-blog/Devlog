import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { pageCount } from '../lib/admin';
/** 관리자 목록의 쪽 넘기기 (062). 한 쪽뿐이면 그리지 않는다. */
export function Pager({ page, total, pageSize, onPage }) {
    const last = pageCount(total, pageSize);
    if (last <= 1)
        return null;
    return (_jsxs("nav", { className: "pager", "aria-label": "\uCABD \uB118\uAE30\uAE30", children: [_jsx("button", { type: "button", className: "btn btn-outline", disabled: page <= 1, onClick: () => onPage(page - 1), "data-tip": "\uC55E \uCABD", children: "\uC774\uC804" }), _jsxs("span", { className: "muted small", "aria-current": "page", children: [page, " / ", last, "\uCABD"] }), _jsx("button", { type: "button", className: "btn btn-outline", disabled: page >= last, onClick: () => onPage(page + 1), "data-tip": "\uB2E4\uC74C \uCABD", children: "\uB2E4\uC74C" })] }));
}
