import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Feed } from '../components/Feed';
import { takeInitialData } from '../lib/api';
import { loginPath, useAuth } from '../lib/auth';
import { Link, useLocation } from '../lib/router';
import { TRENDING_ENDPOINT, TRENDING_HINT } from '../lib/trending';
/** 홈 (003, 017): [최신] [트렌딩] 탭. 기본은 최신, 트렌딩은 `/?tab=trending`. 순위 숫자는 보이지 않는다. */
export function HomePage() {
    const { search } = useLocation();
    const trending = search.get('tab') === 'trending';
    const [boot] = useState(() => takeInitialData('home'));
    const { me } = useAuth();
    useEffect(() => { document.title = trending ? '트렌딩 - devlog' : 'devlog'; }, [trending]);
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { className: "sr-only", children: trending ? '트렌딩' : '최신 글' }), _jsxs("nav", { className: "tabs home-tabs", "aria-label": "\uAE00 \uBAA9\uB85D", children: [_jsx(Link, { to: "/", "aria-current": trending ? undefined : 'page', children: "\uCD5C\uC2E0" }), _jsx(Link, { to: "/?tab=trending", "aria-current": trending ? 'page' : undefined, children: "\uD2B8\uB80C\uB529" })] }), trending ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "muted small trending-hint", children: TRENDING_HINT }), _jsx(Feed, { endpoint: TRENDING_ENDPOINT, storageKey: "feed:trending", initial: boot?.trending ?? null, empty: _jsxs(_Fragment, { children: [_jsx("p", { children: "\uC544\uC9C1 \uD2B8\uB80C\uB529 \uAE00\uC774 \uC5C6\uC5B4\uC694" }), _jsx(Link, { to: "/", className: "btn btn-primary", children: "\uCD5C\uC2E0 \uAE00 \uBCF4\uAE30" })] }) }, "trending")] })) : (_jsx(Feed, { endpoint: "/api/posts", storageKey: "feed:home", initial: boot?.feed ?? null, empty: _jsxs(_Fragment, { children: [_jsx("p", { children: "\uC544\uC9C1 \uC62C\uB77C\uC628 \uAE00\uC774 \uC5C6\uC5B4\uC694. \uCCAB \uAE00\uC758 \uC8FC\uC778\uACF5\uC774 \uB418\uC5B4 \uBCF4\uC138\uC694." }), me?.authenticated ? _jsx(Link, { to: "/write", className: "btn btn-primary", children: "\uAE00\uC4F0\uAE30" })
                            : _jsx(Link, { to: loginPath('/write'), className: "btn btn-primary", children: "\uB85C\uADF8\uC778" })] }) }, "latest"))] }));
}
