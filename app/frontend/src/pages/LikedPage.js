import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Feed } from '../components/Feed';
import { Link } from '../lib/router';
/** 좋아한 글 /lists/liked (027). 좋아요를 누른 최근 순, 지금 읽을 수 있는 글만. */
export function LikedPage() {
    useEffect(() => { document.title = '좋아한 글 - devlog'; }, []);
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { className: "page-title", children: "\uC88B\uC544\uD55C \uAE00" }), _jsx(Feed, { endpoint: "/api/me/liked-posts", storageKey: "feed:liked", initial: null, empty: _jsxs(_Fragment, { children: [_jsx("p", { children: "\uC544\uC9C1 \uC88B\uC544\uC694\uB97C \uB204\uB978 \uAE00\uC774 \uC5C6\uC5B4\uC694" }), _jsx(Link, { to: "/", className: "btn btn-primary", children: "\uD648\uC5D0\uC11C \uAE00 \uCC3E\uAE30" })] }) })] }));
}
