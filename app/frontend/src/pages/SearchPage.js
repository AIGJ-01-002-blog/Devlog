import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Feed } from '../components/Feed';
import { SearchBox } from '../components/SearchBox';
import { takeInitialData } from '../lib/api';
import { Link, navigate, useLocation } from '../lib/router';
import { emptyMessage, hasShortWord, NOTICE_TEXT, parseSort, postsEndpoint, searchApi, searchPath, } from '../lib/search';
import { t } from '../lib/i18n';
/** 검색 (spec 014): 글 탭(관련도순·최신순, 9개씩 [더 보기])과 사람 탭. 서버 화면은 수집 거부(noindex)다. */
export function SearchPage() {
    const { search } = useLocation();
    const q = (search.get('q') ?? '').trim();
    const tab = search.get('tab') === 'people' ? 'people' : 'posts';
    const sort = parseSort(search.get('sort'));
    const [initial] = useState(() => takeInitialData('search')?.result ?? null);
    useEffect(() => {
        document.title = q ? t('\'{0}\' 검색 - devlog', { 0: q }) : t('검색 - devlog');
    }, [q]);
    const go = (nq, ntab = tab, nsort = sort) => navigate(searchPath(nq, ntab, nsort));
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { className: "sr-only", children: t('검색') }), _jsx(SearchBox, { initial: q, placeholder: t('글·태그·사람 검색'), autoFocus: !q, onSearch: (nq) => go(nq) }), q && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "search-head", children: [_jsxs("div", { className: "tabs", role: "tablist", children: [_jsx("button", { type: "button", role: "tab", "aria-selected": tab === 'posts', onClick: () => go(q, 'posts'), children: t('글') }), _jsx("button", { type: "button", role: "tab", "aria-selected": tab === 'people', onClick: () => go(q, 'people'), children: t('사람') })] }), tab === 'posts' && (_jsxs("select", { "aria-label": t('정렬'), value: sort, onChange: (e) => go(q, 'posts', e.target.value), children: [_jsx("option", { value: "relevance", children: t('관련도순') }), _jsx("option", { value: "latest", children: t('최신순') })] }))] }), tab === 'posts'
                        ? _jsx(PostResults, { q: q, sort: sort, initial: initial?.query === q && sort === 'relevance' ? initial : null }, `${q}|${sort}`)
                        : _jsx(PeopleResults, { q: q }, q)] }))] }));
}
/** 글 결과. 블로그 안 검색(blog)도 같은 목록을 쓴다. */
export function PostResults({ q, sort, initial, blog }) {
    const [notice, setNotice] = useState(initial?.notice ?? (hasShortWord(q) ? 'TWO_CHAR_TITLE_TAG_ONLY' : null));
    if (notice === 'TOO_SHORT')
        return _jsx("p", { className: "search-notice", role: "status", children: NOTICE_TEXT.TOO_SHORT });
    return (_jsxs(_Fragment, { children: [notice && _jsx("p", { className: "search-notice", role: "status", children: NOTICE_TEXT[notice] }), _jsx(Feed, { endpoint: postsEndpoint(q, sort, blog), storageKey: `feed:search:${blog ?? ''}:${sort}:${q}`, initial: initial, showAuthor: !blog, onFirstPage: (p) => setNotice(p.notice), empty: _jsxs("p", { children: [emptyMessage(q), notice === 'TWO_CHAR_TITLE_TAG_ONLY' ? ` (${NOTICE_TEXT.TWO_CHAR_TITLE_TAG_ONLY})` : ''] }) })] }));
}
function PeopleResults({ q }) {
    const [page, setPage] = useState(null);
    const [error, setError] = useState(false);
    const load = () => {
        setError(false);
        searchApi.people(q).then(setPage).catch(() => setError(true));
    };
    useEffect(load, [q]);
    if (error)
        return _jsxs("p", { className: "feed-error", role: "alert", children: [t('불러오지 못했어요'), " ", _jsx("button", { type: "button", className: "btn btn-text", onClick: load, children: t('다시 시도') })] });
    if (!page)
        return _jsx("p", { className: "muted center", children: t('불러오는 중…') });
    if (page.notice === 'TOO_SHORT')
        return _jsx("p", { className: "search-notice", role: "status", children: NOTICE_TEXT.TOO_SHORT });
    if (page.items.length === 0)
        return _jsx("div", { className: "empty", children: _jsx("p", { children: t('\'{0}\'에 해당하는 사람이 없어요', { 0: q }) }) });
    return (_jsx("ul", { className: "people-list", children: page.items.map((p) => (_jsx("li", { children: _jsxs(Link, { to: `/@${p.handle}`, className: "person", children: [_jsx(Avatar, { src: p.profileImageUrl, name: p.nickname, seed: p.handle, size: 48 }), _jsxs("span", { children: [_jsx("b", { children: p.nickname }), " ", _jsxs("span", { className: "muted", children: ["@", p.handle] }), p.bioFirstLine && _jsx("span", { className: "person-bio muted", children: p.bioFirstLine })] })] }) }, p.id))) }));
}
