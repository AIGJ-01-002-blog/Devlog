import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Feed } from '../components/Feed';
import { GraphLogo } from '../components/GraphLogo';
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
import { NavIcon } from '../components/NavIcons';
import { avatarColor, AVATAR_COLORS } from '../lib/avatar';
import { compactNumber } from '../lib/format';
import { t } from '../lib/i18n';
/** 블로그 표지 색(0~3). 같은 블로그는 언제나 같은 색이다. */
export function blogTone(handle) {
    return AVATAR_COLORS.indexOf(avatarColor(handle)) % 4;
}
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
        return _jsx("main", { className: "container", children: _jsx("p", { className: "muted center", children: t('불러오는 중…') }) });
    return (_jsxs("main", { className: "container", children: [_jsxs("header", { className: "blog-hero", children: [_jsx("div", { className: "blog-cover", "data-tone": blogTone(profile.handle), "aria-hidden": "true" }), _jsxs("div", { className: "blog-hero-body", children: [_jsxs("div", { className: "blog-hero-top", children: [_jsx("span", { className: "blog-avatar", children: _jsx(Avatar, { src: profile.profileImageUrl, name: profile.nickname, seed: profile.handle, size: 112 }) }), _jsxs("div", { className: "blog-hero-actions", children: [_jsx(Link, { to: `/@${profile.handle}/rss`, className: "btn btn-outline btn-icon", "aria-label": t('RSS 구독'), "data-tip": t('RSS 구독: 구독 앱으로 이 블로그의 새 글 받기'), children: _jsx(NavIcon, { name: "rss" }) }), profile.mine ? _jsxs(_Fragment, { children: [_jsx(Link, { to: "/settings#profile", className: "btn btn-outline", "data-tip": t('사진·닉네임·소개 바꾸기'), children: t('프로필 편집') }), _jsx(Link, { to: "/manage/posts", className: "btn btn-outline", "data-tip": t('임시글·발행 글·휴지통 관리'), children: t('글 관리') }), _jsxs(Link, { to: "/write", className: "btn btn-primary", "data-tip": t('새 글 쓰기'), children: [_jsx(NavIcon, { name: "pen", size: 16 }), t('새 글')] })] }) : _jsxs(_Fragment, { children: [_jsx(FriendButton, { profile: profile, onChange: (f) => {
                                                            setProfile((p) => p && { ...p, friendship: f, lastActiveDaysAgo: null });
                                                            // 친구가 되면 최근 활동을 다시 받아 온다 (서버가 조건을 판단한다)
                                                            if (f === 'FRIENDS')
                                                                void api(`/api/members/${encodeURIComponent(handle)}`).then(setProfile).catch(() => { });
                                                        } }), _jsx(FollowButton, { handle: profile.handle, following: profile.following, onChange: (st) => setProfile((p) => p && { ...p, following: st.following, followerCount: st.followerCount }) })] })] })] }), _jsx("h1", { className: "blog-name", children: profile.nickname }), _jsxs("p", { className: "blog-handle muted", children: ["@", profile.handle, lastActiveLabel(profile.lastActiveDaysAgo) && _jsxs("span", { className: "blog-active", children: ["  ", t('· 최근 활동'), " ", lastActiveLabel(profile.lastActiveDaysAgo)] })] }), profile.bio && _jsx("p", { className: "bio", children: profile.bio }), _jsx(SocialLinkList, { links: profile.socialLinks }), _jsxs("ul", { className: "blog-stats", children: [_jsx("li", { children: _jsxs("span", { className: "blog-stat", children: [_jsx("b", { children: compactNumber(profile.publicPostCount) }), _jsx("span", { children: t('공개 글') })] }) }), _jsx("li", { children: _jsxs(Link, { to: `/@${profile.handle}/followers`, className: "blog-stat", "data-tip": t('나를 팔로우하는 사람'), children: [_jsx("b", { children: compactNumber(profile.followerCount) }), _jsx("span", { children: t('팔로워') })] }) }), _jsx("li", { children: _jsxs(Link, { to: `/@${profile.handle}/following`, className: "blog-stat", "data-tip": t('내가 팔로우하는 사람'), children: [_jsx("b", { children: compactNumber(profile.followingCount) }), _jsx("span", { children: t('팔로잉') })] }) })] })] })] }), _jsxs("nav", { className: "blog-tabs", "aria-label": t('블로그 메뉴'), children: [_jsx(Link, { to: `/@${profile.handle}`, "aria-current": tab === 'posts' ? 'page' : undefined, children: t('글') }), _jsx(Link, { to: `/@${profile.handle}/series`, "aria-current": tab === 'series' ? 'page' : undefined, children: t('시리즈') }), _jsx(Link, { to: `/@${profile.handle}/about`, "aria-current": tab === 'about' ? 'page' : undefined, children: t('소개') }), _jsxs(Link, { to: `/@${profile.handle}/portfolio`, className: "blog-tab-portfolio", "data-tip": t('프로젝트 위주로 정리한 포트폴리오 화면'), children: [_jsx(GraphLogo, { size: 16 }), "  ", t('포트폴리오로 보기')] })] }), tab === 'about' ? _jsx(BlogAbout, { handle: profile.handle }) : tab === 'series' ? _jsx(BlogSeries, { handle: profile.handle, mine: profile.mine }) : _jsxs(_Fragment, { children: [_jsx(SearchBox, { initial: q, placeholder: t('{0}님의 글 검색', { 0: profile.nickname }), onSearch: searchIn }), q ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "filter-head row", children: [_jsx("b", { children: t('\'{0}\' 검색 결과', { 0: q }) }), _jsx(Link, { to: `/@${handle}`, className: "btn btn-text", children: t('검색 해제') })] }), _jsx(PostResults, { q: q, sort: parseSort(search.get('sort')), initial: null, blog: handle }, q)] })) : _jsxs(_Fragment, { children: [_jsx(BlogTags, { handle: handle, initial: initial?.profile.handle === handle ? initial.blogTags : null, active: tag }), _jsx(Feed, { showAuthor: false, endpoint: `/api/members/${encodeURIComponent(handle)}/posts${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`, storageKey: `feed:blog:${handle}${tag ? `:tag:${tag}` : ''}`, initial: initial?.profile.handle === handle && (initial.tag ?? null) === tag ? initial.feed : null, empty: tag ? _jsx("p", { children: t('이 태그로 공개한 글이 없어요.') }) : profile.mine
                                    ? _jsxs(_Fragment, { children: [_jsx("p", { children: t('아직 공개한 글이 없어요.') }), _jsx(Link, { to: "/write", className: "btn btn-primary", children: t('첫 글 쓰기') })] })
                                    : _jsx("p", { children: t('아직 공개한 글이 없어요.') }) }, tag ?? '')] })] })] }));
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
    return (_jsxs(_Fragment, { children: [tags.length > 0 && (_jsxs("nav", { className: "blog-tags", "aria-label": t('이 블로그의 태그'), children: [shown.map((t) => (_jsxs(Link, { to: blogTagPath(handle, t.name), className: `tag-link${t.name === active ? ' active' : ''}`, "aria-current": t.name === active ? 'page' : undefined, children: ["#", t.name, " ", _jsx("span", { className: "muted", children: t.postCount })] }, t.name))), tags.length > 10 && !all && _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setAll(true), children: t('태그 더 보기') })] })), active && (_jsxs("div", { className: "filter-head row", children: [_jsxs("b", { children: ["#", active, "  ", t('글 {0}개', { 0: activeCount })] }), _jsx(Link, { to: `/@${handle}`, className: "btn btn-text", children: t('필터 해제') })] }))] }));
}
/** 친구 요청·수락·취소·끊기 (008 US1). 요청과 수락은 상대에게 알린다(015 A-1). 거절·취소·끊기는 알리지 않는다. */
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
            setError(e instanceof ApiError ? e.message : t('처리하지 못했어요. 다시 시도해 주세요.'));
        }
        finally {
            setBusy(false);
        }
    };
    const removeAs = (next) => async () => {
        await friendsApi.remove(profile.handle);
        return next;
    };
    return (_jsxs("div", { className: "friend-actions row", children: [relation === 'NONE' && (_jsx("button", { type: "button", className: "btn btn-outline", disabled: busy, "data-tip": t('상대가 수락하면 친구가 돼 친구 공개 글을 서로 볼 수 있어요. 상대에게 알림이 가요'), onClick: () => run(() => friendsApi.request(profile.handle)), children: t('친구 요청') })), relation === 'SENT' && (_jsxs(_Fragment, { children: [_jsx("span", { className: "muted small", children: t('친구 요청을 보냈어요') }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy, "data-tip": t('보낸 요청을 거둬요(상대에게 알리지 않아요)'), onClick: () => run(removeAs('NONE')), children: t('요청 취소') })] })), relation === 'RECEIVED' && (_jsxs(_Fragment, { children: [_jsx("span", { className: "muted small", children: t('나에게 친구 요청을 보냈어요') }), _jsx("button", { type: "button", className: "btn btn-primary", disabled: busy, "data-tip": t('친구가 되고 상대에게 수락 알림이 가요'), onClick: () => run(() => friendsApi.accept(profile.handle)), children: t('수락') }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy, "data-tip": t('요청을 지워요(상대에게 알리지 않아요)'), onClick: () => run(removeAs('NONE')), children: t('거절') })] })), relation === 'FRIENDS' && (_jsxs(_Fragment, { children: [_jsxs("span", { className: "badge", children: [_jsx("span", { "aria-hidden": "true", children: "\uD83D\uDC65" }), "  ", t('친구')] }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy, "data-tip": t('친구 관계를 끊어요(상대에게 알리지 않아요)'), onClick: () => {
                            if (confirm(t('{0}님과 친구를 끊을까요? 상대에게 알림은 가지 않아요.', { 0: profile.nickname })))
                                void run(removeAs('NONE'));
                        }, children: t('친구 끊기') })] })), error && _jsx("p", { className: "error small", role: "alert", children: error })] }));
}
