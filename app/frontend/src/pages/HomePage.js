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
/**
 * 비회원 첫 화면 소개 (048, 051). 슬로건과 "AI에 devlog 연결하기", 그리고 AI가 개발 일지를 쓰는 모습을 보여 준다.
 * 로그인한 사람에게는 바로 글 목록을 보인다. 제목 구조를 흐트리지 않게 소제목 태그는 쓰지 않는다.
 */
function HomeHero() {
    return (_jsxs("section", { className: "home-hero", "aria-label": "devlog \uC18C\uAC1C", children: [_jsxs("div", { className: "home-hero-copy", children: [_jsxs("p", { className: "home-hero-eyebrow", children: [_jsx("span", { className: "home-hero-dot", "aria-hidden": "true" }), "MCP \uAC1C\uBC1C \uC77C\uC9C0 \u00B7 Claude \u00B7 Cursor"] }), _jsxs("p", { className: "home-hero-title", children: ["\uCF54\uB529\uC740 AI\uC640,", _jsx("br", {}), _jsx("span", { className: "home-hero-accent", children: "\uAE30\uB85D\uC740 devlog\uAC00." })] }), _jsx("p", { className: "home-hero-sub", children: "\uB0B4 AI \uB3C4\uAD6C\uC5D0 devlog\uB97C \uC5F0\uACB0\uD558\uBA74, \uC624\uB298 \uC791\uC5C5\uD55C \uB300\uD654\uC640 \uCEE4\uBC0B\uC744 \uC815\uB9AC\uD574 \uAC1C\uBC1C \uC77C\uC9C0 \uCD08\uC548\uC744 \uC368 \uC918\uC694. \uB098\uB294 \uD655\uC778\uD558\uACE0 [\uBC1C\uD589]\uB9CC \uB204\uB974\uBA74 \uB3FC\uC694." }), _jsxs("div", { className: "home-hero-actions", children: [_jsx(Link, { to: "/mcp", className: "btn btn-primary btn-lg", children: "AI\uC5D0 devlog \uC5F0\uACB0\uD558\uAE30" }), _jsx(Link, { to: loginPath('/write'), className: "btn btn-outline btn-lg", children: "\uC9C1\uC811 \uAE00\uC4F0\uAE30" })] })] }), _jsx(HeroDemo, {})] }));
}
/** AI 도구 안에서 개발 일지를 부탁하는 장면. 장식이라 화면 읽기 프로그램에는 한 줄 설명만 읽힌다. */
function HeroDemo() {
    return (_jsxs("figure", { className: "hero-demo", children: [_jsx("figcaption", { className: "sr-only", children: "\uC608\uC2DC: AI\uC5D0\uAC8C \"\uC624\uB298 \uAC1C\uBC1C \uC77C\uC9C0 \uC368 \uC918\"\uB77C\uACE0 \uD558\uBA74 devlog\uC5D0 \uC784\uC2DC\uAE00\uC774 \uC0DD\uAE34\uB2E4" }), _jsxs("div", { className: "hero-demo-bar", "aria-hidden": "true", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {}), _jsx("b", { children: "Claude Code" })] }), _jsxs("div", { className: "hero-demo-body", "aria-hidden": "true", children: [_jsxs("p", { className: "hero-demo-me", children: [_jsx("span", { children: "\u203A" }), " \uC624\uB298 \uD55C \uC791\uC5C5\uC73C\uB85C \uAC1C\uBC1C \uC77C\uC9C0 \uC368 \uC918"] }), _jsxs("p", { className: "hero-demo-tool", children: [_jsx("span", { className: "hero-demo-ok", children: "\u25CF" }), " devlog \u00B7 ", _jsx("code", { children: "write_devlog" })] }), _jsxs("div", { className: "hero-demo-card", children: [_jsx("span", { className: "hero-demo-label", children: "\uC784\uC2DC\uAE00" }), _jsx("b", { children: "Gemini \uD55C\uB3C4 \uB118\uC73C\uBA74 Ollama\uB85C \uB118\uAE30\uAE30" }), _jsx("span", { className: "hero-demo-meta", children: "\uCEE4\uBC0B 4\uAC1C \u00B7 \uB300\uD654 \uC694\uC57D \u00B7 \uD0DC\uADF8 spring-ai, ollama" })] }), _jsx("p", { className: "hero-demo-ai", children: "devlog\uC5D0 \uC784\uC2DC\uAE00\uC744 \uB9CC\uB4E4\uC5C8\uC5B4\uC694. \uC77D\uC5B4 \uBCF4\uACE0 \uBC1C\uD589\uD574 \uC8FC\uC138\uC694." })] })] }));
}
