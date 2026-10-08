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
    const { me, loading } = useAuth();
    useEffect(() => { document.title = trending ? '트렌딩 - devlog' : 'devlog'; }, [trending]);
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { className: "sr-only", children: trending ? '트렌딩' : '최신 글' }), !loading && !me?.authenticated && _jsx(HomeHero, {}), _jsxs("nav", { className: "tabs home-tabs", "aria-label": "\uAE00 \uBAA9\uB85D", children: [_jsx(Link, { to: "/", "aria-current": trending ? undefined : 'page', children: "\uCD5C\uC2E0" }), _jsx(Link, { to: "/?tab=trending", "aria-current": trending ? 'page' : undefined, children: "\uD2B8\uB80C\uB529" })] }), trending ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "muted small trending-hint", children: TRENDING_HINT }), _jsx(Feed, { endpoint: TRENDING_ENDPOINT, storageKey: "feed:trending", initial: boot?.trending ?? null, empty: _jsxs(_Fragment, { children: [_jsx("p", { children: "\uC544\uC9C1 \uD2B8\uB80C\uB529 \uAE00\uC774 \uC5C6\uC5B4\uC694" }), _jsx(Link, { to: "/", className: "btn btn-primary", children: "\uCD5C\uC2E0 \uAE00 \uBCF4\uAE30" })] }) }, "trending")] })) : (_jsx(Feed, { endpoint: "/api/posts", storageKey: "feed:home", initial: boot?.feed ?? null, empty: _jsxs(_Fragment, { children: [_jsx("p", { children: "\uC544\uC9C1 \uC62C\uB77C\uC628 \uAE00\uC774 \uC5C6\uC5B4\uC694. \uCCAB \uAE00\uC758 \uC8FC\uC778\uACF5\uC774 \uB418\uC5B4 \uBCF4\uC138\uC694." }), me?.authenticated ? _jsx(Link, { to: "/write", className: "btn btn-primary", children: "\uAE00\uC4F0\uAE30" })
                            : _jsx(Link, { to: loginPath('/write'), className: "btn btn-primary", children: "\uB85C\uADF8\uC778" })] }) }, "latest"))] }));
}
/** 비회원 첫 화면 소개 (048). 로그인한 사람에게는 바로 글 목록을 보인다. 제목 구조를 흐트리지 않게 소제목 태그는 쓰지 않는다. */
function HomeHero() {
    return (_jsxs("section", { className: "home-hero", "aria-label": "devlog \uC18C\uAC1C", children: [_jsxs("p", { className: "home-hero-eyebrow", children: [_jsx("span", { className: "home-hero-dot", "aria-hidden": "true" }), "\uAC1C\uBC1C\uC790\uC758 \uAE30\uB85D \uACF5\uAC04"] }), _jsxs("p", { className: "home-hero-title", children: ["\uC4F0\uB294 \uC21C\uAC04\uBD80\uD130", _jsx("br", {}), "\uC77D\uD788\uB294 \uC21C\uAC04\uAE4C\uC9C0"] }), _jsx("p", { className: "home-hero-sub", children: "\uC790\uB3D9 \uC800\uC7A5\uB418\uB294 \uC5D0\uB514\uD130, AI \uD0DC\uADF8 \uCD94\uCC9C, \uC2DC\uB9AC\uC988\uC640 \uBAA9\uCC28\uAE4C\uC9C0. \uBC30\uC6B4 \uAC83\uC744 \uAE30\uB85D\uD558\uACE0 \uD568\uAED8 \uC77D\uC5B4\uC694." }), _jsxs("div", { className: "home-hero-actions", children: [_jsx(Link, { to: loginPath('/write'), className: "btn btn-primary btn-lg", children: "\uAE00\uC4F0\uAE30 \uC2DC\uC791\uD558\uAE30" }), _jsx(Link, { to: "/tags", className: "btn btn-outline btn-lg", children: "\uD0DC\uADF8 \uB458\uB7EC\uBCF4\uAE30" })] })] }));
}
