import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { cappedCount, fullDate, relativeDate } from '../lib/format';
import { Link } from '../lib/router';
import { tagPath } from '../lib/tags';
import { VISIBILITY_ICON, VISIBILITY_LABEL } from '../lib/visibility';
import { Avatar } from './Avatar';
import { NavIcon } from './NavIcons';
/** 표지 색 번호(0~3). 같은 글은 언제나 같은 색이다. */
export function coverTone(id) {
    return ((id % 4) + 4) % 4;
}
/** 표지에 크게 올릴 제목 첫 글자. 이모지·한글도 한 글자로 센다. */
export function coverGlyph(title) {
    return Array.from(title.trim())[0]?.toUpperCase() ?? '#';
}
/** 카드에 보이는 태그 수. 넘치면 …로 줄이고 나머지는 툴팁으로 보인다 */
export const CARD_TAG_LIMIT = 3;
/** 홈·블로그 카드. 썸네일이 없어도 높이가 같고, 요약은 짧아도 3줄 높이다 (docs/10 §2). */
export function PostCard({ card, showAuthor = true }) {
    return (_jsxs("article", { className: "card", children: [_jsx(Link, { to: card.url, className: "card-thumb", tabIndex: -1, "aria-hidden": "true", children: card.thumbnailUrl ? _jsx("img", { src: card.thumbnailUrl, alt: "", width: 640, height: 360, loading: "lazy" }) : (
                // 사진이 없으면 글마다 정해진 그라데이션 위에 제목 첫 글자를 크게 올린 표지 (048)
                _jsxs("span", { className: "card-thumb-empty card-cover", "data-tone": coverTone(card.id), children: [_jsxs("span", { className: "card-cover-mark", children: ["devlog/@", card.author.handle] }), _jsx("span", { className: "card-cover-glyph", children: coverGlyph(card.title) })] })) }), _jsxs("div", { className: "card-body", children: [_jsx("h2", { className: "card-title", children: _jsx(Link, { to: card.url, children: card.title }) }), card.snippetHtml != null
                        // 서버가 전부 이스케이프하고 검색어에만 <mark>를 붙인 문장이다 (014 FR-019)
                        ? _jsx("p", { className: "card-excerpt card-snippet", dangerouslySetInnerHTML: { __html: card.snippetHtml } })
                        : _jsx("p", { className: "card-excerpt", children: card.excerpt ?? '' }), _jsx(CardTags, { tags: card.tags ?? [] }), _jsxs("div", { className: "card-meta", children: [card.similar && (
                            // 하이브리드 검색(054)에서 의미로만 찾은 글. 검색어 강조가 없는 이유를 알려 준다
                            _jsxs(_Fragment, { children: [_jsx("span", { className: "badge badge-similar", title: "\uAC80\uC0C9\uC5B4\uAC00 \uADF8\uB300\uB85C \uB4E4\uC5B4 \uC788\uC9C0 \uC54A\uC9C0\uB9CC \uB0B4\uC6A9\uC774 \uBE44\uC2B7\uD574 \uCC3E\uC740 \uAE00\uC774\uC5D0\uC694", children: "\uBE44\uC2B7\uD55C \uAE00" }), ' · '] })), card.visibility === 'FRIENDS' && (_jsxs(_Fragment, { children: [_jsxs("span", { className: "badge", title: "\uCE5C\uAD6C\uC5D0\uAC8C\uB9CC \uBCF4\uC774\uB294 \uAE00", children: [VISIBILITY_ICON.FRIENDS, " ", VISIBILITY_LABEL.FRIENDS] }), ' · '] })), _jsx("time", { dateTime: card.firstPublicAt ?? card.publishedAt, title: fullDate(card.firstPublicAt ?? card.publishedAt), children: relativeDate(card.firstPublicAt ?? card.publishedAt) })] })] }), showAuthor && (_jsxs("footer", { className: "card-footer", children: [_jsxs(Link, { to: `/@${card.author.handle}`, className: "card-author", children: [_jsx(Avatar, { src: card.author.profileImageUrl, name: card.author.nickname, seed: card.author.handle, size: 24 }), _jsxs("span", { children: ["by ", _jsx("b", { children: card.author.nickname })] })] }), _jsx(CardStats, { card: card })] }))] }));
}
function CardTags({ tags }) {
    if (tags.length === 0)
        return null;
    const rest = tags.slice(CARD_TAG_LIMIT);
    return (_jsxs("ul", { className: "card-tags", "aria-label": "\uD0DC\uADF8", children: [tags.slice(0, CARD_TAG_LIMIT).map((t) => (_jsx("li", { children: _jsxs(Link, { to: tagPath(t), className: "card-tag", "data-tip": `#${t} 태그 글 보기`, children: ["#", t] }) }, t))), rest.length > 0 && (_jsx("li", { className: "card-tag-more", tabIndex: 0, "aria-label": `태그 ${rest.length}개 더: ${rest.join(', ')}`, "data-tip": rest.map((t) => `#${t}`).join(' '), children: "\u2026" }))] }));
}
/** 조회·댓글·좋아요. 99를 넘으면 99+로 줄이고, 정확한 수는 툴팁으로 보인다 */
function CardStats({ card }) {
    const views = card.viewCount ?? 0;
    const items = [
        { key: 'view', icon: 'eye', label: '조회', n: views, unit: '회' },
        { key: 'comment', icon: 'comment', label: '댓글', n: card.commentCount, unit: '개' },
        { key: 'like', icon: 'heart', label: '좋아요', n: card.likeCount, unit: '개' },
    ];
    return (_jsx("span", { className: "card-stats", children: items.map((it) => (_jsxs("span", { className: `card-stat card-${it.key}`, "data-tip": `${it.label} ${it.n.toLocaleString('ko-KR')}${it.unit}`, children: [_jsxs("span", { "aria-hidden": "true", children: [_jsx(NavIcon, { name: it.icon, size: 14 }), cappedCount(it.n)] }), _jsxs("span", { className: "sr-only", children: [it.label, " ", it.n.toLocaleString('ko-KR'), it.unit] })] }, it.key))) }));
}
