import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Feed } from '../components/Feed';
import { FEED_ENDPOINT } from '../lib/follow';
import { Link } from '../lib/router';
import { t } from '../lib/i18n';
/** 팔로잉 피드 (016 US2): 팔로우한 사람의 공개 글을 홈과 같은 카드·정렬로 9개씩. 로그인 필요. */
export function FeedPage() {
    const [followsAnyone, setFollowsAnyone] = useState(null);
    useEffect(() => { document.title = t('피드 - devlog'); }, []);
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { className: "page-title", children: t('피드') }), _jsx(Feed, { endpoint: FEED_ENDPOINT, storageKey: "feed:following", initial: null, onFirstPage: (p) => setFollowsAnyone(p.followsAnyone ?? null), empty: followsAnyone === false
                    ? _jsxs(_Fragment, { children: [_jsx("p", { children: t('팔로우한 사람이 없어요. 홈에서 읽고 싶은 블로그를 찾아보세요') }), _jsx(Link, { to: "/", className: "btn btn-primary", children: t('홈') })] })
                    : _jsx("p", { children: t('팔로우한 사람의 공개 글이 아직 없어요') }) })] }));
}
