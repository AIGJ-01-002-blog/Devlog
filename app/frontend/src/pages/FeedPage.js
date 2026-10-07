import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Feed } from '../components/Feed';
import { FEED_ENDPOINT } from '../lib/follow';
import { Link } from '../lib/router';
/** 팔로잉 피드 (016 US2): 팔로우한 사람의 공개 글을 홈과 같은 카드·정렬로 9개씩. 로그인 필요. */
export function FeedPage() {
    const [followsAnyone, setFollowsAnyone] = useState(null);
    useEffect(() => { document.title = '피드 - devlog'; }, []);
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { className: "page-title", children: "\uD53C\uB4DC" }), _jsx(Feed, { endpoint: FEED_ENDPOINT, storageKey: "feed:following", initial: null, onFirstPage: (p) => setFollowsAnyone(p.followsAnyone ?? null), empty: followsAnyone === false
                    ? _jsxs(_Fragment, { children: [_jsx("p", { children: "\uD314\uB85C\uC6B0\uD55C \uC0AC\uB78C\uC774 \uC5C6\uC5B4\uC694. \uD648\uC5D0\uC11C \uC77D\uACE0 \uC2F6\uC740 \uBE14\uB85C\uADF8\uB97C \uCC3E\uC544\uBCF4\uC138\uC694" }), _jsx(Link, { to: "/", className: "btn btn-primary", children: "\uD648" })] })
                    : _jsx("p", { children: "\uD314\uB85C\uC6B0\uD55C \uC0AC\uB78C\uC758 \uACF5\uAC1C \uAE00\uC774 \uC544\uC9C1 \uC5C6\uC5B4\uC694" }) })] }));
}
