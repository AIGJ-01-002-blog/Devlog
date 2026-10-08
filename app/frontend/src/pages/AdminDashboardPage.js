import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { AdminNav } from '../components/AdminNav';
import { BarChart } from '../components/BarChart';
import { change, consoleApi, count, PERIODS } from '../lib/admin';
import { Link, navigate, useLocation } from '../lib/router';
const METRICS = [
    { key: 'views', label: '조회수', unit: '회' },
    { key: 'posts', label: '새 글', unit: '편' },
    { key: 'signups', label: '가입', unit: '명' },
    { key: 'comments', label: '댓글', unit: '개' },
    { key: 'likes', label: '좋아요', unit: '개' },
    { key: 'reports', label: '신고', unit: '건' },
];
function points(d, key) {
    return d.daily.map((day) => {
        const [, m, dd] = day.date.split('-').map(Number);
        return { label: `${m}.${dd}`, fullLabel: `${m}월 ${dd}일`, value: day[key] };
    });
}
/** 관리자 대시보드 (062): 처리할 일, 기간 합계(이전 기간 대비), 날짜별 추이, 많이 본 글·많이 쓴 회원, 전체 현황. */
export function AdminDashboardPage() {
    const { search } = useLocation();
    const days = (PERIODS.find((p) => String(p) === search.get('days')) ?? 30);
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [metric, setMetric] = useState('views');
    const current = useRef(days);
    current.current = days;
    useEffect(() => { document.title = '관리자 대시보드 - devlog'; }, []);
    useEffect(() => {
        setError(false);
        consoleApi.dashboard(days)
            .then((d) => { if (current.current === days)
            setData(d); })
            .catch(() => { if (current.current === days)
            setError(true); });
    }, [days]);
    const m = METRICS.find((x) => x.key === metric) ?? METRICS[0];
    return (_jsxs("main", { className: "container admin admin-wide", children: [_jsx("h1", { className: "page-title", children: "\uAD00\uB9AC\uC790 \uD398\uC774\uC9C0" }), _jsx(AdminNav, {}), _jsxs("div", { className: "admin-toolbar", children: [_jsx("div", { className: "segmented", role: "group", "aria-label": "\uAE30\uAC04", children: PERIODS.map((p) => (_jsxs("button", { type: "button", "aria-pressed": p === days, "data-tip": `오늘을 포함한 최근 ${p}일을 봐요`, onClick: () => navigate(p === 30 ? '/admin' : `/admin?days=${p}`), children: [p, "\uC77C"] }, p))) }), data && _jsxs("span", { className: "muted small", children: [data.from.replaceAll('-', '.'), " ~ ", data.to.replaceAll('-', '.'), " \u00B7 \uC774\uC804 ", days, "\uC77C\uACFC \uBE44\uAD50"] })] }), error && _jsx("p", { className: "error", role: "alert", children: "\uD1B5\uACC4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694." }), !data && !error && _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }), data && (_jsxs(_Fragment, { children: [(data.totals.pendingReports > 0 || data.totals.openInquiries > 0) && (_jsxs("section", { className: "admin-todo", "aria-label": "\uCC98\uB9AC\uD560 \uC77C", children: [data.totals.pendingReports > 0 && (_jsxs(Link, { to: "/admin/reports", className: "admin-todo-item", "data-tip": "\uCC98\uB9AC\uB97C \uAE30\uB2E4\uB9AC\uB294 \uC2E0\uACE0\uB85C \uAC00\uC694", children: ["\uCC98\uB9AC\uD560 \uC2E0\uACE0 ", _jsx("strong", { children: count(data.totals.pendingReports) }), "\uAC74"] })), data.totals.openInquiries > 0 && (_jsxs(Link, { to: "/admin/inquiries", className: "admin-todo-item", "data-tip": "\uB2F5\uD558\uC9C0 \uC54A\uC740 \uBB38\uC758\u00B7\uBC84\uADF8 \uC2E0\uACE0\uB85C \uAC00\uC694", children: ["\uB2F5\uD560 \uBB38\uC758 ", _jsx("strong", { children: count(data.totals.openInquiries) }), "\uAC74"] }))] })), _jsxs("section", { className: "stat-grid", "aria-label": `최근 ${days}일 합계`, children: [METRICS.map((x) => {
                                const c = change(data.current[x.key], data.previous[x.key]);
                                return (_jsxs("button", { type: "button", className: "stat-tile", "aria-pressed": x.key === metric, "data-tip": `${x.label} 날짜별 그래프 보기`, onClick: () => setMetric(x.key), children: [_jsx("span", { className: "stat-label", children: x.label }), _jsx("span", { className: "stat-value", children: count(data.current[x.key]) }), _jsx("span", { className: `stat-change ${c.trend}`, children: c.text || ' ' })] }, x.key));
                            }), _jsxs("div", { className: "stat-tile static", "data-tip": "\uCD5C\uADFC \uD65C\uB3D9 \uC2DC\uAC01\uC774 \uC774 \uAE30\uAC04 \uC548\uC5D0 \uC788\uB294 \uD68C\uC6D0", children: [_jsx("span", { className: "stat-label", children: "\uD65C\uB3D9\uD55C \uD68C\uC6D0" }), _jsx("span", { className: "stat-value", children: count(data.activeMembers) }), _jsxs("span", { className: "stat-change flat", children: ["\uC804\uCCB4 ", count(data.totals.members.active), "\uBA85 \uC911"] })] })] }), _jsx("section", { className: "admin-card", children: _jsx(BarChart, { title: m.label, unit: m.unit, points: points(data, metric) }) }), _jsxs("div", { className: "admin-columns", children: [_jsxs("section", { className: "admin-card", children: [_jsx("h2", { children: "\uB9CE\uC774 \uBCF8 \uAE00" }), data.topPosts.length === 0 ? _jsx("p", { className: "muted small", children: "\uC774 \uAE30\uAC04\uC5D0 \uC870\uD68C\uB41C \uACF5\uAC1C \uAE00\uC774 \uC5C6\uC5B4\uC694." }) : (_jsx("ol", { className: "rank-list", children: data.topPosts.map((p) => (_jsxs("li", { children: [_jsx("a", { href: p.link, className: "rank-title", children: p.title }), _jsxs("span", { className: "muted small", children: ["@", p.authorHandle, " \u00B7 \uC870\uD68C ", count(p.views), " \u00B7 \uC88B\uC544\uC694 ", count(p.likes), " \u00B7 \uB313\uAE00 ", count(p.comments)] })] }, p.id))) }))] }), _jsxs("section", { className: "admin-card", children: [_jsx("h2", { children: "\uB9CE\uC774 \uC4F4 \uD68C\uC6D0" }), data.topAuthors.length === 0 ? _jsx("p", { className: "muted small", children: "\uC774 \uAE30\uAC04\uC5D0 \uBC1C\uD589\uD55C \uAE00\uC774 \uC5C6\uC5B4\uC694." }) : (_jsx("ol", { className: "rank-list", children: data.topAuthors.map((a) => (_jsxs("li", { children: [_jsx(Link, { to: `/admin/members/${a.handle}`, className: "rank-title", "data-tip": "\uD68C\uC6D0 \uD1B5\uACC4\u00B7\uAD00\uB9AC \uBCF4\uAE30", children: a.nickname ?? a.handle }), _jsxs("span", { className: "muted small", children: ["@", a.handle, " \u00B7 \uC0C8 \uAE00 ", count(a.posts), "\uD3B8"] })] }, a.handle))) }))] })] }), _jsxs("section", { className: "admin-card", children: [_jsx("h2", { children: "\uC804\uCCB4 \uD604\uD669" }), _jsxs("dl", { className: "totals", children: [_jsxs("div", { children: [_jsx("dt", { children: "\uD68C\uC6D0" }), _jsxs("dd", { children: [count(data.totals.members.total), "\uBA85"] }), _jsxs("dd", { className: "muted small", children: ["\uD65C\uB3D9 ", count(data.totals.members.active), " \u00B7 \uC815\uC9C0 ", count(data.totals.members.suspended), " \u00B7 \uD0C8\uD1F4 \uC2E0\uCCAD ", count(data.totals.members.withdrawing), " \u00B7 \uB9E4\uB2C8\uC800 ", count(data.totals.members.managers)] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\uBC1C\uD589\uD55C \uAE00" }), _jsxs("dd", { children: [count(data.totals.posts.published), "\uD3B8"] }), _jsxs("dd", { className: "muted small", children: ["\uACF5\uAC1C ", count(data.totals.posts.publicPosts), " \u00B7 \uBE44\uACF5\uAC1C ", count(data.totals.posts.privatePosts), " \u00B7 \uC228\uAE40 ", count(data.totals.posts.hidden)] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\uC784\uC2DC\uAE00\u00B7\uD734\uC9C0\uD1B5" }), _jsxs("dd", { children: [count(data.totals.posts.drafts), "\uD3B8"] }), _jsxs("dd", { className: "muted small", children: ["\uD734\uC9C0\uD1B5 ", count(data.totals.posts.trash), "\uD3B8"] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\uC870\uD68C\uC218" }), _jsxs("dd", { children: [count(data.totals.views), "\uD68C"] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\uC88B\uC544\uC694" }), _jsxs("dd", { children: [count(data.totals.likes), "\uAC1C"] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\uB313\uAE00" }), _jsxs("dd", { children: [count(data.totals.comments), "\uAC1C"] })] })] })] })] }))] }));
}
