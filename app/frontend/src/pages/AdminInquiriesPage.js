import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminNav } from '../components/AdminNav';
import { fullDate, relativeDate } from '../lib/format';
import { adminInquiryApi, CATEGORIES, STATUS_HINT, STATUS_LABEL, categoryLabel } from '../lib/inquiry';
import { Link, useLocation } from '../lib/router';
/** 문의 관리 (054): [처리할 것]은 오래된 순(먼저 온 것부터), [처리함]은 최근 순. 종류로 거른다. */
export function AdminInquiriesPage() {
    const { search } = useLocation();
    const tab = search.get('tab') === 'done' ? 'done' : 'open';
    const category = (CATEGORIES.find((c) => c.code === search.get('category'))?.code ?? null);
    const [items, setItems] = useState([]);
    const [next, setNext] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    // 탭·종류를 바꾼 뒤 늦게 온 이전 응답은 버린다
    const key = `${tab}:${category}`;
    const current = useRef(key);
    current.current = key;
    useEffect(() => { document.title = '문의 관리 - devlog'; }, []);
    const load = useCallback(async (before) => {
        setError(false);
        try {
            const page = await adminInquiryApi.list(tab, category, before);
            if (current.current !== key)
                return;
            setItems((prev) => (before != null ? [...prev, ...page.items.filter((r) => !prev.some((p) => p.id === r.id))] : page.items));
            setNext(page.nextBefore);
        }
        catch {
            if (current.current === key)
                setError(true);
        }
        finally {
            if (current.current === key)
                setLoaded(true);
        }
    }, [tab, category, key]);
    useEffect(() => {
        setItems([]);
        setLoaded(false);
        void load(null);
    }, [load]);
    const href = (t, c) => `/admin/inquiries?tab=${t}${c ? `&category=${c}` : ''}`;
    return (_jsxs("main", { className: "container narrow admin", children: [_jsx("h1", { className: "page-title", children: "\uBB38\uC758 \uAD00\uB9AC" }), _jsx(AdminNav, {}), _jsxs("nav", { className: "tabs", "aria-label": "\uBB38\uC758 \uBAA9\uB85D", children: [_jsx(Link, { to: href('open', category), "aria-current": tab === 'open' ? 'page' : undefined, title: "\uC811\uC218\u00B7\uCC98\uB9AC \uC911\uC778 \uBB38\uC758 (\uC624\uB798\uB41C \uC21C)", children: "\uCC98\uB9AC\uD560 \uAC83" }), _jsx(Link, { to: href('done', category), "aria-current": tab === 'done' ? 'page' : undefined, title: "\uD574\uACB0\u00B7\uB2EB\uD78C \uBB38\uC758 (\uCD5C\uADFC \uC21C)", children: "\uCC98\uB9AC\uD568" })] }), _jsxs("div", { className: "filters", role: "group", "aria-label": "\uC885\uB958", children: [_jsx(Link, { to: href(tab, null), className: `chip${category ? '' : ' active'}`, "aria-current": category ? undefined : 'true', children: "\uC804\uCCB4" }), CATEGORIES.map((c) => (_jsx(Link, { to: href(tab, c.code), className: `chip${category === c.code ? ' active' : ''}`, "aria-current": category === c.code ? 'true' : undefined, title: c.hint, children: c.label }, c.code)))] }), error && _jsx("p", { className: "error", role: "alert", children: "\uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694." }), loaded && !error && items.length === 0 && (_jsx("div", { className: "empty", children: _jsx("p", { children: tab === 'open' ? '처리할 문의가 없어요.' : '처리한 문의가 없어요.' }) })), _jsx("ul", { className: "admin-cases", children: items.map((i) => (_jsxs("li", { className: "admin-case", children: [_jsxs("div", { className: "admin-case-main", children: [_jsx("span", { className: "badge", children: categoryLabel(i.category) }), _jsx("span", { className: `badge status-${i.status.toLowerCase()}`, title: STATUS_HINT[i.status], children: STATUS_LABEL[i.status] }), i.source === 'MCP' && _jsx("span", { className: "badge", title: "\uC5F0\uACB0\uD55C AI\uAC00 report_bug\uB85C \uBCF4\uB0B8 \uC2E0\uACE0", children: "AI \uC2E0\uACE0" }), _jsx(Link, { to: `/admin/inquiries/${i.id}`, className: "admin-case-title", children: i.title })] }), _jsxs("div", { className: "muted small", children: ["#", i.id, " \u00B7 @", i.memberHandle, i.toolName && _jsxs(_Fragment, { children: [" \u00B7 \uB3C4\uAD6C ", i.toolName] }), i.fixedVersion && _jsxs(_Fragment, { children: [" \u00B7 v", i.fixedVersion] }), ' · ', _jsx("time", { dateTime: i.createdAt, title: fullDate(i.createdAt), children: relativeDate(i.createdAt) })] })] }, i.id))) }), next != null && _jsx("button", { type: "button", className: "btn btn-outline more", onClick: () => load(next), children: "\uB354 \uBCF4\uAE30" })] }));
}
