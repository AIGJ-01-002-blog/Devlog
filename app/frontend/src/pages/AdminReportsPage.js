import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminNav } from '../components/AdminNav';
import { fullDate, relativeDate } from '../lib/format';
import { adminApi, reasonSummary, STATUS_LABEL } from '../lib/moderation';
import { Link, useLocation } from '../lib/router';
/** 신고 관리 (019 US2): 대상별로 묶은 신고. [대기]는 신고 수 많은 순 → 최근 순, [처리됨]은 처리한 순. */
export function AdminReportsPage() {
    const { search } = useLocation();
    const tab = search.get('tab') === 'handled' ? 'handled' : 'pending';
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    // 탭을 바꾼 뒤 늦게 온 이전 탭의 응답은 버린다
    const current = useRef(tab);
    current.current = tab;
    useEffect(() => { document.title = '신고 관리 - devlog'; }, []);
    const load = useCallback(async (from) => {
        setError(false);
        try {
            const page = await adminApi.list(tab, from);
            if (current.current !== tab)
                return;
            setItems((prev) => (from ? [...prev, ...page.items.filter((r) => !prev.some((p) => p.caseId === r.caseId))] : page.items));
            setCursor(page.nextCursor);
        }
        catch {
            if (current.current === tab)
                setError(true);
        }
        finally {
            if (current.current === tab)
                setLoaded(true);
        }
    }, [tab]);
    useEffect(() => {
        setItems([]);
        setLoaded(false);
        void load(null);
    }, [load]);
    return (_jsxs("main", { className: "container narrow admin", children: [_jsx("h1", { className: "page-title", children: "\uC2E0\uACE0 \uAD00\uB9AC" }), _jsx(AdminNav, {}), _jsxs("nav", { className: "tabs", "aria-label": "\uC2E0\uACE0 \uBAA9\uB85D", children: [_jsx(Link, { to: "/admin/reports", "aria-current": tab === 'pending' ? 'page' : undefined, children: "\uB300\uAE30" }), _jsx(Link, { to: "/admin/reports?tab=handled", "aria-current": tab === 'handled' ? 'page' : undefined, children: "\uCC98\uB9AC\uB428" })] }), error && _jsx("p", { className: "error", role: "alert", children: "\uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694." }), loaded && !error && items.length === 0 && (_jsx("div", { className: "empty", children: _jsx("p", { children: tab === 'pending' ? '처리할 신고가 없어요.' : '처리한 신고가 없어요.' }) })), _jsx("ul", { className: "admin-cases", children: items.map((r) => (_jsxs("li", { className: "admin-case", children: [_jsxs("div", { className: "admin-case-main", children: [_jsx("span", { className: "badge", children: r.targetType === 'POST' ? '글' : '댓글' }), tab === 'handled' && _jsx("span", { className: `badge${r.status === 'HIDDEN' ? ' badge-warn' : ''}`, children: STATUS_LABEL[r.status] }), _jsx(Link, { to: `/admin/reports/${r.caseId}`, className: "admin-case-title", children: r.preview || '(내용 없음)' })] }), _jsxs("div", { className: "muted small", children: ["@", r.authorHandle, " \u00B7 \uC2E0\uACE0 ", r.reportCount, "\uAC74 \u00B7 ", reasonSummary(r.reasons), " \u00B7", ' ', tab === 'pending'
                                    ? _jsxs("time", { dateTime: r.latestAt, title: fullDate(r.latestAt), children: ["\uCD5C\uADFC ", relativeDate(r.latestAt)] })
                                    : r.handledAt && _jsxs("time", { dateTime: r.handledAt, title: fullDate(r.handledAt), children: ["\uCC98\uB9AC ", relativeDate(r.handledAt)] }), tab === 'handled' && r.status === 'HIDDEN' && !r.hiddenNow && ' · 숨김 해제됨'] })] }, r.caseId))) }), cursor && _jsx("button", { type: "button", className: "btn btn-outline more", onClick: () => load(cursor), children: "\uB354 \uBCF4\uAE30" })] }));
}
