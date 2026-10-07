import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { relativeDate } from '../lib/format';
import { Link } from '../lib/router';
import { VISIBILITY_ICON, VISIBILITY_LABEL } from '../lib/visibility';
import { Avatar } from './Avatar';
/** 홈·블로그 카드. 썸네일이 없어도 높이가 같고, 요약은 짧아도 3줄 높이다 (docs/10 §2). */
export function PostCard({ card, showAuthor = true }) {
    return (_jsxs("article", { className: "card", children: [_jsx(Link, { to: card.url, className: "card-thumb", tabIndex: -1, "aria-hidden": "true", children: card.thumbnailUrl ? _jsx("img", { src: card.thumbnailUrl, alt: card.title, loading: "lazy" }) : _jsx("span", { className: "card-thumb-empty" }) }), _jsxs("div", { className: "card-body", children: [_jsx("h2", { className: "card-title", children: _jsx(Link, { to: card.url, children: card.title }) }), card.snippetHtml != null
                        // 서버가 전부 이스케이프하고 검색어에만 <mark>를 붙인 문장이다 (014 FR-019)
                        ? _jsx("p", { className: "card-excerpt card-snippet", dangerouslySetInnerHTML: { __html: card.snippetHtml } })
                        : _jsx("p", { className: "card-excerpt", children: card.excerpt ?? '' }), _jsxs("div", { className: "card-meta", children: [card.visibility === 'FRIENDS' && (_jsxs(_Fragment, { children: [_jsxs("span", { className: "badge", title: "\uCE5C\uAD6C\uC5D0\uAC8C\uB9CC \uBCF4\uC774\uB294 \uAE00", children: [VISIBILITY_ICON.FRIENDS, " ", VISIBILITY_LABEL.FRIENDS] }), ' · '] })), _jsx("time", { dateTime: card.firstPublicAt ?? card.publishedAt, children: relativeDate(card.firstPublicAt ?? card.publishedAt) }), card.commentCount > 0 && _jsxs("span", { children: [" \u00B7 \uB313\uAE00 ", card.commentCount] })] })] }), showAuthor && (_jsxs("footer", { className: "card-footer", children: [_jsxs(Link, { to: `/@${card.author.handle}`, className: "card-author", children: [_jsx(Avatar, { src: card.author.profileImageUrl, name: card.author.nickname, seed: card.author.handle, size: 24 }), _jsxs("span", { children: ["by ", _jsx("b", { children: card.author.nickname })] })] }), _jsxs("span", { className: "card-likes", "aria-label": `좋아요 ${card.likeCount}`, children: ["\u2665 ", card.likeCount] })] }))] }));
}
