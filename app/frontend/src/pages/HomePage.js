import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { BranchList, BranchMark } from '../components/BranchList';
import { Feed } from '../components/Feed';
import { api, takeInitialData } from '../lib/api';
import { loginPath, useAuth } from '../lib/auth';
import { Link, useLocation } from '../lib/router';
import { TRENDING_ENDPOINT, TRENDING_HINT } from '../lib/trending';
import { tagPath } from '../lib/tags';
/**
 * 홈 (003, 017, 072): [최신] [트렌딩] 탭. 기본은 최신, 트렌딩은 `/?tab=trending`. 순위 숫자는 보이지 않는다.
 * 최신은 브랜치 그래프 목록이고 `/?branch=s12`처럼 한 브랜치 글만 걸러 볼 수 있다. 넓은 화면에는 옆 칸이 있다.
 */
export function HomePage() {
    const { search } = useLocation();
    const trending = search.get('tab') === 'trending';
    const branch = trending ? null : search.get('branch');
    const [boot] = useState(() => takeInitialData('home'));
    const { me, loading } = useAuth();
    useEffect(() => { document.title = trending ? '트렌딩 - devlog' : 'devlog'; }, [trending]);
    return (_jsxs("main", { className: "container home-layout", children: [_jsxs("div", { className: "home-main", children: [!loading && !me?.authenticated && _jsx(HomeHero, {}), _jsxs("div", { className: "home-head", children: [_jsx("h1", { className: "page-title", children: trending ? '트렌딩' : '개발 기록' }), _jsx("p", { className: "muted small", children: trending ? TRENDING_HINT : '새 글은 main에 쌓이고, 이어지는 글은 시리즈·주제 브랜치로 갈라져요.' })] }), _jsxs("nav", { className: "tabs home-tabs", "aria-label": "\uAE00 \uBAA9\uB85D", children: [_jsx(Link, { to: "/", "aria-current": trending ? undefined : 'page', children: "\uCD5C\uC2E0" }), _jsx(Link, { to: "/?tab=trending", "aria-current": trending ? 'page' : undefined, children: "\uD2B8\uB80C\uB529" })] }), trending ? (_jsx(Feed, { endpoint: TRENDING_ENDPOINT, storageKey: "feed:trending", initial: boot?.trending ?? null, renderItems: (items, hasMore) => _jsx(BranchList, { items: items, hasMore: hasMore, graph: false }), empty: _jsxs(_Fragment, { children: [_jsx("p", { children: "\uC544\uC9C1 \uD2B8\uB80C\uB529 \uAE00\uC774 \uC5C6\uC5B4\uC694" }), _jsx(Link, { to: "/", className: "btn btn-primary", children: "\uCD5C\uC2E0 \uAE00 \uBCF4\uAE30" })] }) }, "trending")) : (
                    // 서버가 처음 넣어 준 목록은 거르지 않은 목록이라, 브랜치로 거를 때는 쓰지 않는다
                    _jsx(Feed, { endpoint: branch ? `/api/posts?branch=${encodeURIComponent(branch)}` : '/api/posts', storageKey: branch ? `feed:home:${branch}` : 'feed:home', initial: branch ? null : boot?.feed ?? null, renderItems: (items, hasMore) => (_jsxs(_Fragment, { children: [_jsx(BranchChips, { items: items, active: branch }), _jsx(BranchList, { items: items, hasMore: hasMore })] })), empty: branch ? (_jsxs(_Fragment, { children: [_jsx("p", { children: "\uC774 \uBE0C\uB79C\uCE58\uC5D0 \uBCF4\uC774\uB294 \uAE00\uC774 \uC5C6\uC5B4\uC694" }), _jsx(Link, { to: "/", className: "btn btn-primary", children: "\uBAA8\uB4E0 \uAE00 \uBCF4\uAE30" })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { children: "\uC544\uC9C1 \uC62C\uB77C\uC628 \uAE00\uC774 \uC5C6\uC5B4\uC694. \uCCAB \uAE00\uC758 \uC8FC\uC778\uACF5\uC774 \uB418\uC5B4 \uBCF4\uC138\uC694." }), me?.authenticated ? _jsx(Link, { to: "/write", className: "btn btn-primary", children: "\uAE00\uC4F0\uAE30" })
                                    : _jsx(Link, { to: loginPath('/write'), className: "btn btn-primary", children: "\uB85C\uADF8\uC778" })] })) }, branch ?? 'latest'))] }), _jsx(HomeAside, {})] }));
}
/** 최신 목록 위 브랜치 버튼 (072). 지금 보이는 글의 브랜치를 위에서부터 5개까지 */
function BranchChips({ items, active }) {
    const seen = new Map();
    for (const c of items) {
        if (c.branch && c.branch.total > 1 && !seen.has(c.branch.key))
            seen.set(c.branch.key, c.branch);
    }
    let chips = [...seen.values()].slice(0, BRANCH_CHIPS);
    if (active && !chips.some((b) => b.key === active)) {
        const cur = seen.get(active);
        if (cur)
            chips = [cur, ...chips.slice(0, BRANCH_CHIPS - 1)];
    }
    if (chips.length === 0 && !active)
        return null;
    return (_jsxs("nav", { className: "branch-chips", "aria-label": "\uBE0C\uB79C\uCE58\uB85C \uAC78\uB7EC \uBCF4\uAE30", children: [_jsx(Link, { to: "/", className: "branch-chip", "aria-current": active ? undefined : 'page', "data-tip": "\uBAA8\uB4E0 \uAE00\uC744 \uC2DC\uAC04\uC21C\uC73C\uB85C \uBD10\uC694", children: "\uBAA8\uB4E0 \uAE00" }), chips.map((b) => (_jsxs(Link, { to: `/?branch=${b.key}`, className: `branch-chip branch-chip-${b.kind.toLowerCase()}`, "aria-current": active === b.key ? 'page' : undefined, "data-tip": branchTip(b), children: [_jsx(BranchMark, { kind: b.kind }), b.name] }, b.key)))] }));
}
const BRANCH_CHIPS = 5;
/** 브랜치 버튼 설명. 주제 브랜치는 글쓴이가 만든 시리즈가 아니라 자동으로 묶인 것임을 알린다 */
function branchTip(b) {
    return b.kind === 'SERIES'
        ? `시리즈: 글쓴이가 엮은 ${b.name} ${b.total}편만 봐요`
        : `주제 브랜치: 태그·내용이 비슷해 자동으로 묶인 글 ${b.total}편만 봐요`;
}
/** 홈 옆 칸 (072): 이어지는 주제, 많이 쓰는 태그, AI 연결, 릴리스 노트·문의. 좁은 화면에서는 숨긴다(무한 스크롤 끝에 닿지 않는다) */
function HomeAside() {
    const [topics, setTopics] = useState([]);
    const [tags, setTags] = useState([]);
    useEffect(() => {
        // 곁들이 정보라 실패하면 그 칸만 비운다
        api('/api/topics/popular').then(setTopics, () => setTopics([]));
        api('/api/tags?limit=8').then(setTags, () => setTags([]));
    }, []);
    return (_jsxs("aside", { className: "home-aside", "aria-label": "\uB458\uB7EC\uBCF4\uAE30", children: [topics.length > 0 && (_jsxs("section", { className: "aside-box", children: [_jsx("h2", { className: "aside-title", children: "\uC774\uC5B4\uC9C0\uB294 \uC8FC\uC81C" }), _jsx("ul", { className: "aside-topics", children: topics.map((t) => (_jsx("li", { children: _jsxs(Link, { to: t.url, "data-tip": `주제 브랜치: 태그·내용이 비슷해 자동으로 묶인 글 ${t.postCount}편이에요`, children: [_jsx(BranchMark, { kind: "TOPIC" }), _jsx("span", { children: t.name }), _jsxs("span", { className: "muted small", children: [t.postCount, "\uD3B8"] })] }) }, t.key))) })] })), tags.length > 0 && (_jsxs("section", { className: "aside-box", children: [_jsx("h2", { className: "aside-title", children: "\uB9CE\uC774 \uC4F0\uB294 \uD0DC\uADF8" }), _jsx("ul", { className: "card-tags", children: tags.map((t) => _jsx("li", { children: _jsxs(Link, { to: tagPath(t.name), className: "card-tag", "data-tip": `글 ${t.postCount}편`, children: ["#", t.name] }) }, t.name)) })] })), _jsxs("section", { className: "aside-box aside-ai", children: [_jsx("h2", { className: "aside-title", children: "AI\uAC00 \uC4F0\uB294 \uAC1C\uBC1C \uC77C\uC9C0" }), _jsx("p", { className: "muted small", children: "Claude\u00B7Cursor\uC5D0 devlog\uB97C \uC5F0\uACB0\uD558\uBA74 \uC624\uB298 \uD55C \uC791\uC5C5\uC744 \uC784\uC2DC\uAE00\uB85C \uC815\uB9AC\uD574 \uC918\uC694." }), _jsx(Link, { to: "/mcp", className: "btn btn-outline btn-small", children: "AI\uC5D0 \uC5F0\uACB0\uD558\uAE30" })] }), _jsxs("nav", { className: "aside-links", "aria-label": "\uB3C4\uC6C0\uB9D0", children: [_jsx(Link, { to: "/releases", children: "\uB9B4\uB9AC\uC2A4 \uB178\uD2B8" }), _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), _jsx(Link, { to: "/support", children: "\uBB38\uC758\u00B7\uC2E0\uACE0" })] })] }));
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
