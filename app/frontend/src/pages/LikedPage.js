import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Feed } from '../components/Feed';
import { Link } from '../lib/router';
import { t } from '../lib/i18n';
/** 좋아한 글 /lists/liked (027). 좋아요를 누른 최근 순, 지금 읽을 수 있는 글만. */
export function LikedPage() {
    useEffect(() => { document.title = t('좋아한 글 - devlog'); }, []);
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { className: "page-title", children: t('좋아한 글') }), _jsx(Feed, { endpoint: "/api/me/liked-posts", storageKey: "feed:liked", initial: null, empty: _jsxs(_Fragment, { children: [_jsx("p", { children: t('아직 좋아요를 누른 글이 없어요') }), _jsx(Link, { to: "/", className: "btn btn-primary", children: t('홈에서 글 찾기') })] }) })] }));
}
