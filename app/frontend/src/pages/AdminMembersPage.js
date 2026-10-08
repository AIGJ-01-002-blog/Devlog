import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { AdminNav } from '../components/AdminNav';
import { Pager } from '../components/Pager';
import { consoleApi, count, MEMBER_STATUS_LABEL, PROVIDER_LABEL, roleLabel } from '../lib/admin';
import { fullDate, relativeDate } from '../lib/format';
import { Link, navigate, useLocation } from '../lib/router';
const ROLES = [
    { code: '', label: '모든 권한' },
    { code: 'STAFF', label: '관리자·매니저' },
    { code: 'USER', label: '일반 회원' },
];
const STATUSES = [
    { code: '', label: '모든 상태' },
    { code: 'ACTIVE', label: '활동 중' },
    { code: 'SUSPENDED', label: '정지' },
    { code: 'WITHDRAWN', label: '탈퇴 신청' },
];
/** 회원 관리 목록 (062): 주소·닉네임으로 찾고 권한·상태로 거른다. 새로 가입한 순. 조건은 주소에 남겨 뒤로 가기로 돌아올 수 있다. */
export function AdminMembersPage() {
    const { search } = useLocation();
    const q = search.get('q') ?? '';
    const role = search.get('role') ?? '';
    const status = search.get('status') ?? '';
    const page = Math.max(1, Number(search.get('page')) || 1);
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [text, setText] = useState(q);
    const key = `${q}|${role}|${status}|${page}`;
    const current = useRef(key);
    current.current = key;
    useEffect(() => { document.title = '회원 관리 - devlog'; }, []);
    useEffect(() => { setText(q); }, [q]);
    useEffect(() => {
        setError(false);
        consoleApi.members(q, role, status, page)
            .then((d) => { if (current.current === key)
            setData(d); })
            .catch(() => { if (current.current === key)
            setError(true); });
    }, [key, q, role, status, page]);
    const go = (next) => {
        const p = new URLSearchParams({ q, role, status, page: '1', ...next });
        for (const k of [...p.keys()])
            if (!p.get(k) || (k === 'page' && p.get(k) === '1'))
                p.delete(k);
        const s = p.toString();
        navigate(`/admin/members${s ? `?${s}` : ''}`);
    };
    const submit = (e) => {
        e.preventDefault();
        go({ q: text.trim() });
    };
    return (_jsxs("main", { className: "container admin admin-wide", children: [_jsx("h1", { className: "page-title", children: "\uAD00\uB9AC\uC790 \uD398\uC774\uC9C0" }), _jsx(AdminNav, {}), _jsxs("form", { className: "admin-filters", role: "search", onSubmit: submit, children: [_jsx("input", { type: "search", value: text, onChange: (e) => setText(e.target.value), placeholder: "\uC8FC\uC18C\u00B7\uB2C9\uB124\uC784", "aria-label": "\uD68C\uC6D0 \uCC3E\uAE30" }), _jsx("select", { value: role, onChange: (e) => go({ role: e.target.value }), "aria-label": "\uAD8C\uD55C\uC73C\uB85C \uAC70\uB974\uAE30", "data-tip": "\uAD8C\uD55C\uC73C\uB85C \uAC70\uB974\uAE30", children: ROLES.map((r) => _jsx("option", { value: r.code, children: r.label }, r.code)) }), _jsx("select", { value: status, onChange: (e) => go({ status: e.target.value }), "aria-label": "\uC0C1\uD0DC\uB85C \uAC70\uB974\uAE30", "data-tip": "\uC0C1\uD0DC\uB85C \uAC70\uB974\uAE30", children: STATUSES.map((s) => _jsx("option", { value: s.code, children: s.label }, s.code)) }), _jsx("button", { type: "submit", className: "btn btn-outline", "data-tip": "\uC8FC\uC18C\u00B7\uB2C9\uB124\uC784 \uC77C\uBD80\uB85C \uCC3E\uAE30", children: "\uCC3E\uAE30" })] }), error && _jsx("p", { className: "error", role: "alert", children: "\uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694." }), data && _jsxs("p", { className: "muted small", role: "status", children: ["\uD68C\uC6D0 ", count(data.total), "\uBA85"] }), data && data.items.length === 0 && _jsx("div", { className: "empty", children: _jsx("p", { children: "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uD68C\uC6D0\uC774 \uC5C6\uC5B4\uC694." }) }), data && data.items.length > 0 && (_jsx("div", { className: "admin-table-wrap", children: _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "\uD68C\uC6D0" }), _jsx("th", { scope: "col", children: "\uAD8C\uD55C\u00B7\uC0C1\uD0DC" }), _jsx("th", { scope: "col", className: "num", children: "\uAE00" }), _jsx("th", { scope: "col", className: "num", children: "\uB313\uAE00" }), _jsx("th", { scope: "col", children: "\uAC00\uC785" }), _jsx("th", { scope: "col", children: "\uCD5C\uADFC \uD65C\uB3D9" })] }) }), _jsx("tbody", { children: data.items.map(({ member: m, posts, drafts, hiddenPosts, comments }) => (_jsxs("tr", { children: [_jsxs("td", { "data-label": "\uD68C\uC6D0", children: [_jsx(Link, { to: `/admin/members/${m.handle}`, className: "admin-case-title", "data-tip": "\uD1B5\uACC4\u00B7\uAD8C\uD55C\u00B7\uC815\uC9C0 \uAD00\uB9AC", children: m.nickname ?? m.handle }), _jsxs("span", { className: "muted small", children: [" @", m.handle, m.provider ? ` · ${PROVIDER_LABEL[m.provider] ?? m.provider}` : ''] })] }), _jsxs("td", { "data-label": "\uAD8C\uD55C\u00B7\uC0C1\uD0DC", children: [m.role !== 'USER' && _jsx("span", { className: "badge badge-brand", children: roleLabel(m.role) }), ' ', _jsx("span", { className: `badge${m.status === 'ACTIVE' ? '' : ' badge-warn'}`, children: MEMBER_STATUS_LABEL[m.status] ?? m.status })] }), _jsx("td", { "data-label": "\uAE00", className: "num", "data-tip": `발행 ${posts} · 임시 ${drafts} · 숨김 ${hiddenPosts}`, children: count(posts) }), _jsx("td", { "data-label": "\uB313\uAE00", className: "num", children: count(comments) }), _jsx("td", { "data-label": "\uAC00\uC785", children: _jsx("time", { dateTime: m.joinedAt, children: fullDate(m.joinedAt) }) }), _jsx("td", { "data-label": "\uCD5C\uADFC \uD65C\uB3D9", children: m.lastActiveAt ? _jsx("time", { dateTime: m.lastActiveAt, title: fullDate(m.lastActiveAt), children: relativeDate(m.lastActiveAt) }) : _jsx("span", { className: "muted", children: "-" }) })] }, m.id))) })] }) })), data && _jsx(Pager, { page: data.page, total: data.total, pageSize: data.pageSize, onPage: (p) => go({ page: String(p) }) })] }));
}
