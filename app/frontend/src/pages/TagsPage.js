import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { takeInitialData } from '../lib/api';
import { Link } from '../lib/router';
import { tagPath, tagsApi } from '../lib/tags';
/** 전체 태그 목록: 공개 글 수 많은 순 상위 100개 (010 FR-023). */
export function TagsPage() {
    const initial = takeInitialData('tags')?.tags ?? null;
    const [tags, setTags] = useState(initial);
    const [error, setError] = useState(false);
    const load = () => {
        setError(false);
        tagsApi.top().then(setTags).catch(() => setError(true));
    };
    useEffect(() => {
        if (!initial)
            load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { className: "page-title", children: "\uD0DC\uADF8" }), error && _jsxs("p", { className: "feed-error", children: ["\uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694 ", _jsx("button", { type: "button", className: "btn btn-text", onClick: load, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] }), !error && !tags && _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }), tags && tags.length === 0 && _jsx("div", { className: "empty", children: _jsx("p", { children: "\uC544\uC9C1 \uD0DC\uADF8\uAC00 \uC5C6\uC5B4\uC694." }) }), tags && tags.length > 0 && (_jsx("ul", { className: "tag-cloud", children: tags.map((t) => (_jsx("li", { children: _jsxs(Link, { to: tagPath(t.name), className: "tag-link", children: ["#", t.name, " ", _jsx("span", { className: "muted", children: t.postCount })] }) }, t.name))) }))] }));
}
