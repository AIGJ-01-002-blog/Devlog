import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { BranchList, BranchMark } from '../components/BranchList';
import { Feed } from '../components/Feed';
import { api, takeInitialData } from '../lib/api';
import { branchChips } from '../lib/branch';
import { loginPath, useAuth } from '../lib/auth';
import { Link, useLocation } from '../lib/router';
import { TRENDING_ENDPOINT, TRENDING_HINT } from '../lib/trending';
import { tagPath } from '../lib/tags';
import { t } from '../lib/i18n';
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
    // 브랜치 버튼은 거르지 않은 최신 목록에서 뽑는다. 걸러 본 목록에서 뽑으면 다른 브랜치 버튼이 사라진다
    const [latest, setLatest] = useState(() => boot?.feed?.items ?? null);
    useEffect(() => { document.title = trending ? t('트렌딩 - devlog') : 'devlog'; }, [trending]);
    useEffect(() => {
        if (!branch || latest)
            return;
        let live = true;
        // 걸러 본 주소로 바로 들어와 최신 목록이 없을 때만 첫 쪽을 한 번 받는다. 실패하면 고른 버튼만 보인다
        api('/api/posts').then((p) => { if (live)
            setLatest(p.items); }, () => { });
        return () => { live = false; };
    }, [branch, latest]);
    return (_jsxs("main", { className: "container home-layout", children: [_jsxs("div", { className: "home-main", children: [!loading && !me?.authenticated && _jsx(HomeHero, {}), _jsxs("div", { className: "home-head", children: [_jsx("h1", { className: "page-title", children: trending ? t('트렌딩') : t('개발 기록') }), _jsx("p", { className: "muted small", children: trending ? TRENDING_HINT : t('새 글은 main에 쌓이고, 이어지는 글은 시리즈·주제 브랜치로 갈라져요.') })] }), _jsxs("nav", { className: "tabs home-tabs", "aria-label": t('글 목록'), children: [_jsx(Link, { to: "/", "aria-current": trending ? undefined : 'page', children: t('최신') }), _jsx(Link, { to: "/?tab=trending", "aria-current": trending ? 'page' : undefined, children: t('트렌딩') })] }), trending ? (_jsx(Feed, { endpoint: TRENDING_ENDPOINT, storageKey: "feed:trending", initial: boot?.trending ?? null, renderItems: (items, hasMore) => _jsx(BranchList, { items: items, hasMore: hasMore, graph: false }), empty: _jsxs(_Fragment, { children: [_jsx("p", { children: t('아직 트렌딩 글이 없어요') }), _jsx(Link, { to: "/", className: "btn btn-primary", children: t('최신 글 보기') })] }) }, "trending")) : (
                    // 서버가 처음 넣어 준 목록은 거르지 않은 목록이라, 브랜치로 거를 때는 쓰지 않는다
                    _jsx(Feed, { endpoint: branch ? `/api/posts?branch=${encodeURIComponent(branch)}` : '/api/posts', storageKey: branch ? `feed:home:${branch}` : 'feed:home', initial: branch ? null : boot?.feed ?? null, renderItems: (items, hasMore) => (_jsxs(_Fragment, { children: [_jsx(BranchChips, { base: branch ? latest ?? [] : items, visible: items, active: branch, onBase: branch ? undefined : setLatest }), _jsx(BranchList, { items: items, hasMore: hasMore })] })), empty: branch ? (_jsxs(_Fragment, { children: [_jsx("p", { children: t('이 브랜치에 보이는 글이 없어요') }), _jsx(Link, { to: "/", className: "btn btn-primary", children: t('모든 글 보기') })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { children: t('아직 올라온 글이 없어요. 첫 글의 주인공이 되어 보세요.') }), me?.authenticated ? _jsx(Link, { to: "/write", className: "btn btn-primary", children: t('글쓰기') })
                                    : _jsx(Link, { to: loginPath('/write'), className: "btn btn-primary", children: t('로그인') })] })) }, branch ?? 'latest'))] }), _jsx(HomeAside, {})] }));
}
/** 최신 목록 위 브랜치 버튼 (072). 긴 이름은 버튼 안에서 말줄임하고, 마우스를 올리면 전체 이름이 보인다 */
function BranchChips({ base, visible, active, onBase }) {
    // 거르지 않은 목록을 보는 동안 더 받은 쪽까지 기억해 두었다가 걸러 볼 때 같은 버튼을 보인다
    useEffect(() => { onBase?.(base); }, [base, onBase]);
    const chips = branchChips(base, active, visible);
    if (chips.length === 0 && !active)
        return null;
    return (_jsxs("nav", { className: "branch-chips", "aria-label": t('브랜치로 걸러 보기'), children: [_jsx(Link, { to: "/", className: "branch-chip", "aria-current": active ? undefined : 'page', "data-tip": t('모든 글을 시간순으로 봐요'), children: t('모든 글') }), chips.map((b) => (_jsxs(Link, { to: `/?branch=${b.key}`, className: `branch-chip branch-chip-${b.kind.toLowerCase()}`, "aria-current": active === b.key ? 'page' : undefined, "data-tip": branchTip(b), children: [_jsx(BranchMark, { kind: b.kind }), _jsx("span", { className: "branch-chip-name", children: b.name })] }, b.key)))] }));
}
/** 브랜치 버튼 설명. 주제 브랜치는 글쓴이가 만든 시리즈가 아니라 자동으로 묶인 것임을 알린다 */
function branchTip(b) {
    return b.kind === 'SERIES'
        ? t('시리즈: 글쓴이가 엮은 {0} {1}편만 봐요', { 0: b.name, 1: b.total })
        : t('주제 브랜치: 태그·내용이 비슷해 자동으로 묶인 글 {0}편만 봐요', { 0: b.total });
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
    return (_jsxs("aside", { className: "home-aside", "aria-label": t('둘러보기'), children: [topics.length > 0 && (_jsxs("section", { className: "aside-box", children: [_jsx("h2", { className: "aside-title", children: t('이어지는 주제') }), _jsx("ul", { className: "aside-topics", children: topics.map((topic) => (_jsx("li", { children: _jsxs(Link, { to: topic.url, "data-tip": t('주제 브랜치: 태그·내용이 비슷해 자동으로 묶인 글 {0}편이에요', { 0: topic.postCount }), children: [_jsx(BranchMark, { kind: "TOPIC" }), _jsx("span", { children: topic.name }), _jsx("span", { className: "muted small", children: t('{0}편', { 0: topic.postCount }) })] }) }, topic.key))) })] })), tags.length > 0 && (_jsxs("section", { className: "aside-box", children: [_jsx("h2", { className: "aside-title", children: t('많이 쓰는 태그') }), _jsx("ul", { className: "card-tags", children: tags.map((tag) => _jsx("li", { children: _jsxs(Link, { to: tagPath(tag.name), className: "card-tag", "data-tip": t('글 {0}편', { 0: tag.postCount }), children: ["#", tag.name] }) }, tag.name)) })] })), _jsxs("section", { className: "aside-box aside-ai", children: [_jsx("h2", { className: "aside-title", children: t('AI가 쓰는 개발 일지') }), _jsx("p", { className: "muted small", children: t('Claude·Cursor에 devlog를 연결하면 오늘 한 작업을 임시글로 정리해 줘요.') }), _jsx(Link, { to: "/mcp", className: "btn btn-outline btn-small", children: t('AI에 연결하기') })] }), _jsxs("nav", { className: "aside-links", "aria-label": t('도움말'), children: [_jsx(Link, { to: "/releases", children: t('릴리스 노트') }), _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), _jsx(Link, { to: "/support", children: t('문의·신고') })] })] }));
}
/**
 * 비회원 첫 화면 소개 (048, 051). 슬로건과 "AI에 devlog 연결하기", 그리고 AI가 개발 일지를 쓰는 모습을 보여 준다.
 * 로그인한 사람에게는 바로 글 목록을 보인다. 제목 구조를 흐트리지 않게 소제목 태그는 쓰지 않는다.
 */
function HomeHero() {
    return (_jsxs("section", { className: "home-hero", "aria-label": t('devlog 소개'), children: [_jsxs("div", { className: "home-hero-copy", children: [_jsxs("p", { className: "home-hero-eyebrow", children: [_jsx("span", { className: "home-hero-dot", "aria-hidden": "true" }), t('MCP 개발 일지 · Claude · Cursor')] }), _jsxs("p", { className: "home-hero-title", children: [t('코딩은 AI와,'), _jsx("br", {}), _jsx("span", { className: "home-hero-accent", children: t('기록은 devlog가.') })] }), _jsx("p", { className: "home-hero-sub", children: t('내 AI 도구에 devlog를 연결하면, 오늘 작업한 대화와 커밋을 정리해 개발 일지 초안을 써 줘요. 나는 확인하고 [발행]만 누르면 돼요.') }), _jsxs("div", { className: "home-hero-actions", children: [_jsx(Link, { to: "/mcp", className: "btn btn-primary btn-lg", children: t('AI에 devlog 연결하기') }), _jsx(Link, { to: loginPath('/write'), className: "btn btn-outline btn-lg", children: t('직접 글쓰기') })] })] }), _jsx(HeroDemo, {})] }));
}
/** AI 도구 안에서 개발 일지를 부탁하는 장면. 장식이라 화면 읽기 프로그램에는 한 줄 설명만 읽힌다. */
function HeroDemo() {
    return (_jsxs("figure", { className: "hero-demo", children: [_jsx("figcaption", { className: "sr-only", children: t('예시: AI에게 "오늘 개발 일지 써 줘"라고 하면 devlog에 임시글이 생긴다') }), _jsxs("div", { className: "hero-demo-bar", "aria-hidden": "true", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {}), _jsx("b", { children: "Claude Code" })] }), _jsxs("div", { className: "hero-demo-body", "aria-hidden": "true", children: [_jsxs("p", { className: "hero-demo-me", children: [_jsx("span", { children: "\u203A" }), "  ", t('오늘 한 작업으로 개발 일지 써 줘')] }), _jsxs("p", { className: "hero-demo-tool", children: [_jsx("span", { className: "hero-demo-ok", children: "\u25CF" }), " devlog \u00B7 ", _jsx("code", { children: "write_devlog" })] }), _jsxs("div", { className: "hero-demo-card", children: [_jsx("span", { className: "hero-demo-label", children: t('임시글') }), _jsx("b", { children: t('Gemini 한도 넘으면 Ollama로 넘기기') }), _jsx("span", { className: "hero-demo-meta", children: t('커밋 4개 · 대화 요약 · 태그 spring-ai, ollama') })] }), _jsx("p", { className: "hero-demo-ai", children: t('devlog에 임시글을 만들었어요. 읽어 보고 발행해 주세요.') })] })] }));
}
