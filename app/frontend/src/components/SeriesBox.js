import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { neighbors, seriesApi, seriesPath } from '../lib/series';
/** 글 상세 위의 시리즈 상자 (024 US2-1): 이름, 현재 순서/전체, 펼치는 목록, 이전·다음 글. */
export function SeriesBox({ postId }) {
    const [nav, setNav] = useState(null);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        let alive = true;
        seriesApi.ofPost(postId).then((n) => { if (alive)
            setNav(n); }).catch(() => { });
        return () => { alive = false; };
    }, [postId]);
    if (!nav || nav.posts.length === 0)
        return null;
    const { prev, next } = neighbors(nav);
    return (_jsxs("nav", { className: "series-box", "aria-label": "\uC2DC\uB9AC\uC988", children: [_jsx("h2", { children: _jsx(Link, { to: seriesPath(nav.handle, nav.slug), children: nav.name }) }), open && (_jsx("ol", { className: "series-list", children: nav.posts.map((p) => (_jsx("li", { "aria-current": p.id === postId ? 'page' : undefined, children: p.id === postId ? _jsx("b", { children: p.title }) : _jsx(Link, { to: p.url, children: p.title }) }, p.id))) })), _jsxs("div", { className: "series-foot row", children: [_jsx("button", { type: "button", className: "btn btn-text", "aria-expanded": open, onClick: () => setOpen((o) => !o), children: open ? '▲ 숨기기' : '▼ 목록 보기' }), _jsx("span", { className: "muted small", children: nav.index != null ? `${nav.index}/${nav.posts.length}` : `글 ${nav.posts.length}개` }), _jsxs("span", { className: "series-arrows", children: [prev ? _jsx(Link, { to: prev.url, className: "btn btn-outline", "aria-label": `이전 글: ${prev.title}`, children: "\u2039" })
                                : _jsx("span", { className: "btn btn-outline", "aria-disabled": "true", children: "\u2039" }), next ? _jsx(Link, { to: next.url, className: "btn btn-outline", "aria-label": `다음 글: ${next.title}`, children: "\u203A" })
                                : _jsx("span", { className: "btn btn-outline", "aria-disabled": "true", children: "\u203A" })] })] })] }));
}
