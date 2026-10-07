import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Feed } from '../components/Feed';
import { FollowButton } from '../components/FollowButton';
import { SearchBox } from '../components/SearchBox';
import { SocialLinkList } from '../components/SocialLinkList';
import { parseSort } from '../lib/search';
import { PostResults } from './SearchPage';
import { api, ApiError, takeInitialData } from '../lib/api';
import { loginPath, useAuth } from '../lib/auth';
import { friendsApi, lastActiveLabel } from '../lib/friends';
import { Link, navigate, useLocation } from '../lib/router';
import { blogTagPath, normalizeTag, tagFormatError, tagsApi } from '../lib/tags';
import { NotFoundPage } from './NotFoundPage';
import { BlogSeries } from './SeriesPage';
import { BlogAbout } from '../components/BlogAbout';
/** tab: 블로그 글 목록(기본), [시리즈] 탭 (024), [소개] 탭 (042) */
export function BlogPage({ handle, tab = 'posts' }) {
    const [initial] = useState(() => takeInitialData('blog'));
    const [profile, setProfile] = useState(initial?.profile.handle === handle ? initial.profile : null);
    const [missing, setMissing] = useState(false);
    const { search } = useLocation();
    const rawTag = search.get('tag');
    const tag = rawTag ? normalizeTag(rawTag) : null;
    const badTag = tag != null && tagFormatError(tag) != null;
    const q = (search.get('q') ?? '').trim();
    const searchIn = (nq) => navigate(`/@${handle}?q=${encodeURIComponent(nq)}`);
    useEffect(() => {
        // 정규화되지 않은 필터 값은 정규화된 주소로 바꾼다 (서버는 301)
        if (tag && !badTag && tag !== rawTag)
            navigate(blogTagPath(handle, tag), { replace: true });
    }, [tag, rawTag, badTag, handle]);
    useEffect(() => {
        if (profile?.handle === handle)
            return;
        api(`/api/members/${encodeURIComponent(handle)}`)
            .then(setProfile)
            .catch((e) => { if (e instanceof ApiError && e.status === 404)
            setMissing(true); });
    }, [handle, profile]);
    if (missing || badTag)
        return _jsx(NotFoundPage, {});
    if (!profile)
        return _jsx("main", { className: "container", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    return (_jsxs("main", { className: "container", children: [_jsxs("header", { className: "blog-profile", children: [_jsx(Avatar, { src: profile.profileImageUrl, name: profile.nickname, seed: profile.handle, size: 96 }), _jsxs("div", { children: [_jsx("h1", { children: profile.nickname }), _jsxs("p", { className: "muted", children: ["@", profile.handle] }), profile.bio && _jsx("p", { className: "bio", children: profile.bio }), _jsxs("p", { className: "muted small blog-stats", children: ["\uACF5\uAC1C \uAE00 ", profile.publicPostCount, ' · ', _jsxs(Link, { to: `/@${profile.handle}/followers`, children: ["\uD314\uB85C\uC6CC ", _jsx("b", { children: profile.followerCount })] }), ' · ', _jsxs(Link, { to: `/@${profile.handle}/following`, children: ["\uD314\uB85C\uC789 ", _jsx("b", { children: profile.followingCount })] }), lastActiveLabel(profile.lastActiveDaysAgo) && _jsxs(_Fragment, { children: [" \u00B7 \uCD5C\uADFC \uD65C\uB3D9 ", lastActiveLabel(profile.lastActiveDaysAgo)] }), ' · ', _jsx("a", { href: `/@${profile.handle}/rss`, type: "application/rss+xml", title: "RSS \uB9AC\uB354\uB85C \uC774 \uBE14\uB85C\uADF8\uC758 \uC0C8 \uAE00 \uBC1B\uAE30", children: "RSS" })] }), _jsx(SocialLinkList, { links: profile.socialLinks }), !profile.mine && _jsxs("div", { className: "blog-actions row", children: [_jsx(FollowButton, { handle: profile.handle, following: profile.following, onChange: (st) => setProfile((p) => p && { ...p, following: st.following, followerCount: st.followerCount }) }), _jsx(FriendButton, { profile: profile, onChange: (f) => {
                                            setProfile((p) => p && { ...p, friendship: f, lastActiveDaysAgo: null });
                                            // 친구가 되면 최근 활동을 다시 받아 온다 (서버가 조건을 판단한다)
                                            if (f === 'FRIENDS')
                                                void api(`/api/members/${encodeURIComponent(handle)}`).then(setProfile).catch(() => { });
                                        } })] })] })] }), _jsxs("nav", { className: "blog-tabs", "aria-label": "\uBE14\uB85C\uADF8 \uBA54\uB274", children: [_jsx(Link, { to: `/@${profile.handle}`, "aria-current": tab === 'posts' ? 'page' : undefined, children: "\uAE00" }), _jsx(Link, { to: `/@${profile.handle}/series`, "aria-current": tab === 'series' ? 'page' : undefined, children: "\uC2DC\uB9AC\uC988" }), _jsx(Link, { to: `/@${profile.handle}/about`, "aria-current": tab === 'about' ? 'page' : undefined, children: "\uC18C\uAC1C" })] }), tab === 'about' ? _jsx(BlogAbout, { handle: profile.handle }) : tab === 'series' ? _jsx(BlogSeries, { handle: profile.handle, mine: profile.mine }) : _jsxs(_Fragment, { children: [_jsx(SearchBox, { initial: q, placeholder: `${profile.nickname}님의 글 검색`, onSearch: searchIn }), q ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "filter-head row", children: [_jsxs("b", { children: ["'", q, "' \uAC80\uC0C9 \uACB0\uACFC"] }), _jsx(Link, { to: `/@${handle}`, className: "btn btn-text", children: "\uAC80\uC0C9 \uD574\uC81C" })] }), _jsx(PostResults, { q: q, sort: parseSort(search.get('sort')), initial: null, blog: handle }, q)] })) : _jsxs(_Fragment, { children: [_jsx(BlogTags, { handle: handle, initial: initial?.profile.handle === handle ? initial.blogTags : null, active: tag }), _jsx(Feed, { showAuthor: false, endpoint: `/api/members/${encodeURIComponent(handle)}/posts${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`, storageKey: `feed:blog:${handle}${tag ? `:tag:${tag}` : ''}`, initial: initial?.profile.handle === handle && (initial.tag ?? null) === tag ? initial.feed : null, empty: tag ? _jsx("p", { children: "\uC774 \uD0DC\uADF8\uB85C \uACF5\uAC1C\uD55C \uAE00\uC774 \uC5C6\uC5B4\uC694." }) : profile.mine
                                    ? _jsxs(_Fragment, { children: [_jsx("p", { children: "\uC544\uC9C1 \uACF5\uAC1C\uD55C \uAE00\uC774 \uC5C6\uC5B4\uC694." }), _jsx(Link, { to: "/write", className: "btn btn-primary", children: "\uCCAB \uAE00 \uC4F0\uAE30" })] })
                                    : _jsx("p", { children: "\uC544\uC9C1 \uACF5\uAC1C\uD55C \uAE00\uC774 \uC5C6\uC5B4\uC694." }) }, tag ?? '')] })] })] }));
}
/** 블로그 태그 줄과 필터 머리 (010 FR-030·FR-031): 공개 글의 태그, 글 수 많은 순 처음 10개 + [태그 더 보기]. */
function BlogTags({ handle, initial, active }) {
    const [tags, setTags] = useState(initial);
    const [all, setAll] = useState(false);
    useEffect(() => {
        if (!initial)
            tagsApi.blogTags(handle).then(setTags).catch(() => setTags([]));
    }, [handle, initial]);
    if (!tags)
        return null;
    const shown = all ? tags : tags.slice(0, 10);
    const activeCount = active ? tags.find((t) => t.name === active)?.postCount ?? 0 : 0;
    return (_jsxs(_Fragment, { children: [tags.length > 0 && (_jsxs("nav", { className: "blog-tags", "aria-label": "\uC774 \uBE14\uB85C\uADF8\uC758 \uD0DC\uADF8", children: [shown.map((t) => (_jsxs(Link, { to: blogTagPath(handle, t.name), className: `tag-link${t.name === active ? ' active' : ''}`, "aria-current": t.name === active ? 'page' : undefined, children: ["#", t.name, " ", _jsx("span", { className: "muted", children: t.postCount })] }, t.name))), tags.length > 10 && !all && _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setAll(true), children: "\uD0DC\uADF8 \uB354 \uBCF4\uAE30" })] })), active && (_jsxs("div", { className: "filter-head row", children: [_jsxs("b", { children: ["#", active, " \uAE00 ", activeCount, "\uAC1C"] }), _jsx(Link, { to: `/@${handle}`, className: "btn btn-text", children: "\uD544\uD130 \uD574\uC81C" })] }))] }));
}
/** 친구 요청·수락·취소·끊기 (008 US1). 거절·취소·끊기는 상대에게 알리지 않는다. */
function FriendButton({ profile, onChange }) {
    const { me } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const relation = profile.friendship ?? 'NONE';
    const run = async (fn) => {
        if (!me?.member)
            return navigate(loginPath());
        setBusy(true);
        setError(null);
        try {
            onChange(await fn());
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : '처리하지 못했어요. 다시 시도해 주세요.');
        }
        finally {
            setBusy(false);
        }
    };
    const removeAs = (next) => async () => {
        await friendsApi.remove(profile.handle);
        return next;
    };
    return (_jsxs("div", { className: "friend-actions row", children: [relation === 'NONE' && (_jsx("button", { type: "button", className: "btn btn-outline", disabled: busy, onClick: () => run(() => friendsApi.request(profile.handle)), children: "\uCE5C\uAD6C \uC694\uCCAD" })), relation === 'SENT' && (_jsxs(_Fragment, { children: [_jsx("span", { className: "muted small", children: "\uCE5C\uAD6C \uC694\uCCAD\uC744 \uBCF4\uB0C8\uC5B4\uC694" }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy, onClick: () => run(removeAs('NONE')), children: "\uC694\uCCAD \uCDE8\uC18C" })] })), relation === 'RECEIVED' && (_jsxs(_Fragment, { children: [_jsx("span", { className: "muted small", children: "\uB098\uC5D0\uAC8C \uCE5C\uAD6C \uC694\uCCAD\uC744 \uBCF4\uB0C8\uC5B4\uC694" }), _jsx("button", { type: "button", className: "btn btn-primary", disabled: busy, onClick: () => run(() => friendsApi.accept(profile.handle)), children: "\uC218\uB77D" }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy, onClick: () => run(removeAs('NONE')), children: "\uAC70\uC808" })] })), relation === 'FRIENDS' && (_jsxs(_Fragment, { children: [_jsx("span", { className: "badge", children: "\uD83D\uDC65 \uCE5C\uAD6C" }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy, onClick: () => {
                            if (confirm(`${profile.nickname}님과 친구를 끊을까요? 상대에게 알림은 가지 않아요.`))
                                void run(removeAs('NONE'));
                        }, children: "\uCE5C\uAD6C \uB04A\uAE30" })] })), error && _jsx("p", { className: "error small", role: "alert", children: error })] }));
}
