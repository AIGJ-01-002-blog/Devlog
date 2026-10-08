import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminNav } from '../components/AdminNav';
import { Pager } from '../components/Pager';
import { consoleApi, count, POST_FILTERS } from '../lib/admin';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { REASONS } from '../lib/moderation';
import { Link, navigate, useLocation } from '../lib/router';
/**
 * 글 관리 (062): 발행한 글을 제목·작성자로 찾고 공개·비공개·숨김으로 거른다. 공개 글은 바로 숨길 수 있고(작성자에게 알림),
 * 숨긴 글은 다시 풀 수 있다. 비공개 글은 관리자에게도 제목을 보여 주지 않는다.
 */
export function AdminPostsPage() {
    const { search } = useLocation();
    const { me } = useAuth();
    const q = search.get('q') ?? '';
    const author = search.get('author') ?? '';
    const filter = (POST_FILTERS.find((f) => f.code === search.get('filter'))?.code ?? 'all');
    const page = Math.max(1, Number(search.get('page')) || 1);
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [text, setText] = useState(q);
    const [hiding, setHiding] = useState(null);
    const [reason, setReason] = useState('SPAM');
    const [message, setMessage] = useState(null);
    const key = `${q}|${author}|${filter}|${page}`;
    const current = useRef(key);
    current.current = key;
    useEffect(() => { document.title = '글 관리 - devlog'; }, []);
    useEffect(() => { setText(q); }, [q]);
    const load = useCallback(() => {
        setError(false);
        consoleApi.posts(q, filter, author, page)
            .then((d) => { if (current.current === key)
            setData(d); })
            .catch(() => { if (current.current === key)
            setError(true); });
    }, [key, q, filter, author, page]);
    useEffect(load, [load]);
    const go = (next) => {
        const p = new URLSearchParams({ q, author, filter, page: '1', ...next });
        for (const k of [...p.keys()])
            if (!p.get(k) || (k === 'page' && p.get(k) === '1') || (k === 'filter' && p.get(k) === 'all'))
                p.delete(k);
        const s = p.toString();
        navigate(`/admin/posts${s ? `?${s}` : ''}`);
    };
    const submit = (e) => {
        e.preventDefault();
        go({ q: text.trim() });
    };
    const act = async (work, ok) => {
        setMessage(null);
        try {
            await work();
            setMessage({ ok: true, text: ok });
            setHiding(null);
            load();
        }
        catch (e) {
            setMessage({ ok: false, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '처리하지 못했어요.' });
        }
    };
    return (_jsxs("main", { className: "container admin admin-wide", children: [_jsx("h1", { className: "page-title", children: "\uAD00\uB9AC\uC790 \uD398\uC774\uC9C0" }), _jsx(AdminNav, {}), _jsxs("form", { className: "admin-filters", role: "search", onSubmit: submit, children: [_jsx("input", { type: "search", value: text, onChange: (e) => setText(e.target.value), placeholder: "\uC81C\uBAA9\u00B7\uC791\uC131\uC790 \uC8FC\uC18C", "aria-label": "\uAE00 \uCC3E\uAE30" }), _jsx("button", { type: "submit", className: "btn btn-outline", "data-tip": "\uACF5\uAC1C \uAE00\uC758 \uC81C\uBAA9\uC774\uB098 \uC791\uC131\uC790 \uC8FC\uC18C \uC77C\uBD80\uB85C \uCC3E\uAE30", children: "\uCC3E\uAE30" })] }), _jsx("nav", { className: "tabs", "aria-label": "\uAE00 \uAC70\uB974\uAE30", children: POST_FILTERS.map((f) => (_jsx("button", { type: "button", "aria-selected": f.code === filter, onClick: () => go({ filter: f.code }), children: f.label }, f.code))) }), author && (_jsxs("p", { className: "muted small", children: ["@", author, "\uC758 \uAE00\uB9CC \uBCF4\uB294 \uC911 \u00B7 ", _jsx("button", { type: "button", className: "btn btn-text", onClick: () => go({ author: '' }), children: "\uBAA8\uB4E0 \uAE00 \uBCF4\uAE30" })] })), message && _jsx("p", { className: message.ok ? 'banner banner-ok' : 'error', role: message.ok ? 'status' : 'alert', children: message.text }), error && _jsx("p", { className: "error", role: "alert", children: "\uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694." }), data && _jsxs("p", { className: "muted small", role: "status", children: ["\uAE00 ", count(data.total), "\uD3B8"] }), data && data.items.length === 0 && _jsx("div", { className: "empty", children: _jsx("p", { children: "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uAE00\uC774 \uC5C6\uC5B4\uC694." }) }), _jsx("ul", { className: "admin-cases", children: data?.items.map((p) => (_jsxs("li", { className: "admin-case", children: [_jsxs("div", { className: "admin-case-main", children: [p.hidden && _jsx("span", { className: "badge badge-warn", children: "\uC228\uAE40" }), p.visibility !== 'PUBLIC' && _jsx("span", { className: "badge", children: p.visibility === 'FRIENDS' ? '친구 공개' : '비공개' }), p.title !== null
                                    ? _jsx("a", { href: p.link, className: "admin-case-title", children: p.title })
                                    : _jsx("span", { className: "muted", "data-tip": "\uBE44\uACF5\uAC1C \uAE00\uC740 \uAD00\uB9AC\uC790\uB3C4 \uC81C\uBAA9\uACFC \uBCF8\uBB38\uC744 \uBCF4\uC9C0 \uC54A\uC544\uC694", children: "(\uBE44\uACF5\uAC1C \uAE00)" })] }), _jsxs("div", { className: "muted small", children: [_jsxs(Link, { to: `/admin/members/${p.authorHandle}`, "data-tip": "\uC791\uC131\uC790 \uD1B5\uACC4\u00B7\uAD00\uB9AC \uBCF4\uAE30", children: ["@", p.authorHandle] }), ' ', "\u00B7 \uC870\uD68C ", count(p.views), " \u00B7 \uC88B\uC544\uC694 ", count(p.likes), " \u00B7 \uB313\uAE00 ", count(p.comments)] }), p.visibility === 'PUBLIC' && p.authorHandle !== me?.member?.handle && (_jsx("div", { className: "admin-case-actions", children: p.hidden ? (_jsx("button", { type: "button", className: "btn btn-outline btn-small", "data-tip": "\uC228\uAE40\uC744 \uD480\uC5B4 \uB2E4\uC2DC \uBCF4\uC774\uAC8C \uD574\uC694(\uC791\uC131\uC790\uC5D0\uAC8C \uC54C\uB9AC\uC9C0 \uC54A\uC544\uC694)", onClick: () => act(() => consoleApi.unhidePost(p.id), '숨김을 풀었어요.'), children: "\uC228\uAE40 \uD574\uC81C" })) : hiding === p.id ? (_jsxs("form", { className: "hide-form", onSubmit: (e) => { e.preventDefault(); void act(() => consoleApi.hidePost(p.id, reason), '글을 숨겼어요. 작성자에게 알림이 가요.'); }, children: [_jsx("select", { value: reason, onChange: (e) => setReason(e.target.value), "aria-label": "\uC228\uAE30\uB294 \uC0AC\uC720", children: REASONS.map((r) => _jsx("option", { value: r.code, children: r.label }, r.code)) }), _jsx("button", { type: "submit", className: "btn btn-danger btn-small", children: "\uC228\uAE30\uAE30" }), _jsx("button", { type: "button", className: "btn btn-text btn-small", onClick: () => setHiding(null), children: "\uCDE8\uC18C" })] })) : (_jsx("button", { type: "button", className: "btn btn-outline btn-small", "data-tip": "\uB3C5\uC790\uC5D0\uAC8C \uBCF4\uC774\uC9C0 \uC54A\uAC8C \uC228\uAE30\uACE0 \uC791\uC131\uC790\uC5D0\uAC8C \uC54C\uB824\uC694", onClick: () => { setHiding(p.id); setMessage(null); }, children: "\uC228\uAE30\uAE30\u2026" })) }))] }, p.id))) }), data && _jsx(Pager, { page: data.page, total: data.total, pageSize: data.pageSize, onPage: (n) => go({ page: String(n) }) })] }));
}
