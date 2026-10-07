import { jsx as _jsx } from "react/jsx-runtime";
import { SOCIAL_FIELDS } from '../lib/socialLinks';
/**
 * 블로그 머리의 소셜 정보 (spec 043). 값이 있는 것만 보인다.
 * rel="me"로 블로그 주인의 다른 계정임을 알리고, 외부 사이트라 nofollow·noopener를 붙인다.
 */
export function SocialLinkList({ links }) {
    const shown = SOCIAL_FIELDS.filter((f) => links?.[f.kind]);
    if (!shown.length)
        return null;
    return (_jsx("ul", { className: "social-links", "aria-label": "\uC18C\uC15C \uC815\uBCF4", children: shown.map((f) => {
            const value = links[f.kind];
            return (_jsx("li", { children: _jsx("a", { href: f.href(value), rel: "me nofollow noopener noreferrer", title: value, children: f.label }) }, f.kind));
        }) }));
}
