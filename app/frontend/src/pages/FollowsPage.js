import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { InfiniteLoader } from '../components/InfiniteLoader';
import { FollowButton } from '../components/FollowButton';
import { ApiError, api, takeInitialData } from '../lib/api';
import { HIDDEN_FOLLOW_TEXT, appendPeople, emptyFollowText, followApi } from '../lib/follow';
import { Link } from '../lib/router';
import { NotFoundPage } from './NotFoundPage';
import { t, tNodes } from '../lib/i18n';
/**
 * 팔로워·팔로잉 목록 (016 US3): 최근에 팔로우한 순 20개씩 무한 스크롤(spec 069), 보는 사람 기준 팔로우 버튼. 비회원도 본다.
 * 주인이 목록을 비공개로 두면 본인·관리자 말고는 "비공개 계정입니다"만 보인다(spec 079). 탭의 수는 그대로다.
 */
export function FollowsPage({ handle, direction }) {
    const [initial] = useState(() => {
        const d = takeInitialData('follows');
        return d?.profile.handle === handle ? d : null;
    });
    const [profile, setProfile] = useState(initial?.profile ?? null);
    const [people, setPeople] = useState(initial?.follows.items ?? []);
    const [cursor, setCursor] = useState(initial?.follows.nextCursor ?? null);
    const [loaded, setLoaded] = useState(initial != null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [missing, setMissing] = useState(false);
    const [hidden, setHidden] = useState(initial?.follows.hidden === true);
    useEffect(() => {
        if (profile)
            return;
        api(`/api/members/${encodeURIComponent(handle)}`).then(setProfile)
            .catch((e) => { if (e instanceof ApiError && e.status === 404)
            setMissing(true); });
    }, [handle, profile]);
    const more = async (from) => {
        setLoading(true);
        setError(false);
        try {
            const page = await followApi.list(handle, direction, from);
            // 보는 사이에 비공개로 바뀌면 이미 받은 사람도 지운다 (079)
            setPeople((prev) => (page.hidden ? [] : from ? appendPeople(prev, page.items) : page.items));
            setCursor(page.hidden ? null : page.nextCursor);
            setHidden(page.hidden === true);
            setLoaded(true);
        }
        catch (e) {
            if (e instanceof ApiError && e.status === 404)
                setMissing(true);
            else
                setError(true);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (!loaded)
            void more(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (profile)
            document.title = t('{0}님의 {1} - devlog', { 0: profile.nickname, 1: direction === 'followers' ? t('팔로워') : t('팔로잉') });
    }, [profile, direction]);
    if (missing)
        return _jsx(NotFoundPage, {});
    const who = profile ? _jsx(Link, { to: `/@${handle}`, children: profile.nickname }) : '…';
    return (_jsxs("main", { className: "container narrow", children: [_jsx("h1", { className: "page-title", children: direction === 'followers'
                    ? tNodes('{0}님의 팔로워', { 0: who })
                    : tNodes('{0}님이 팔로우하는 사람', { 0: who }) }), _jsxs("nav", { className: "tabs follow-tabs", "aria-label": t('팔로워·팔로잉'), children: [_jsxs(Link, { to: `/@${handle}/followers`, "aria-current": direction === 'followers' ? 'page' : undefined, children: [t('팔로워'), profile && ` ${profile.followerCount}`] }), _jsxs(Link, { to: `/@${handle}/following`, "aria-current": direction === 'following' ? 'page' : undefined, children: [t('팔로잉'), profile && ` ${profile.followingCount}`] })] }), loaded && hidden && (_jsxs("div", { className: "follow-hidden center", role: "status", children: [_jsx("span", { className: "follow-hidden-icon", "aria-hidden": "true", children: "\uD83D\uDD12" }), _jsx("p", { children: _jsx("b", { children: HIDDEN_FOLLOW_TEXT }) }), _jsx("p", { className: "muted small", children: t('이 회원은 팔로워·팔로잉 목록을 공개하지 않았어요.') })] })), loaded && !hidden && people.length === 0 && !error && _jsx("p", { className: "muted center empty", children: emptyFollowText(direction) }), people.length > 0 && (_jsx("ul", { className: "person-list", children: people.map((p) => (_jsxs("li", { className: "person-row", children: [_jsxs(Link, { to: `/@${p.handle}`, className: "person-who", children: [_jsx(Avatar, { src: p.profileImageUrl, name: p.nickname, seed: p.handle, size: 40 }), _jsxs("span", { children: [_jsx("b", { children: p.nickname }), " ", _jsxs("span", { className: "muted small", children: ["@", p.handle] }), p.bioFirstLine && _jsx("span", { className: "person-bio muted small", children: p.bioFirstLine })] })] }), !p.me && _jsx(FollowButton, { handle: p.handle, following: p.following, small: true })] }, p.id))) })), loading && cursor == null && _jsx("p", { className: "muted center", children: t('불러오는 중…') }), _jsx(InfiniteLoader, { hasMore: cursor != null, loading: loading, failed: error, onMore: () => void more(cursor) })] }));
}
