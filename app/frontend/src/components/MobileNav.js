import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavIcon } from './NavIcons';
import { loginPath, useAuth } from '../lib/auth';
import { Link } from '../lib/router';
/**
 * 좁은 화면(640px 이하)의 아래 탭 (spec 055). 머리말에 다 들어가지 않던 검색·피드·태그·AI 연결을
 * 엄지가 닿는 자리로 옮기고, 터치에는 툴팁이 없으니 아이콘 아래에 이름을 늘 보인다. 넓은 화면에서는 CSS로 숨긴다.
 */
export function MobileNav({ path }) {
    const { me } = useAuth();
    const member = me?.member;
    const items = [
        { to: '/', label: '홈', tip: '최신·트렌딩 글', icon: _jsx(NavIcon, { name: "home", size: 22 }), active: (p) => p === '/' },
        member
            ? { to: '/feed', label: '피드', tip: '팔로우한 사람의 새 글', icon: _jsx(NavIcon, { name: "feed", size: 22 }), active: (p) => p === '/feed' }
            : { to: '/mcp', label: 'AI 연결', tip: 'AI 도구에 devlog 연결하기', icon: _jsx(NavIcon, { name: "ai", size: 22 }), active: (p) => p === '/mcp' },
        { to: '/search', label: '검색', tip: '글·사람 검색', icon: _jsx(NavIcon, { name: "search", size: 22 }), active: (p) => p === '/search' },
        { to: '/tags', label: '태그', tip: '태그별로 글 모아 보기', icon: _jsx(NavIcon, { name: "tag", size: 22 }), active: (p) => p === '/tags' || p.startsWith('/tags/') },
        member
            ? { to: `/@${member.handle}`, label: '내 블로그', tip: '내 블로그로 가기', icon: _jsx(NavIcon, { name: "me", size: 22 }), active: (p) => p === `/@${member.handle}` || p.startsWith(`/@${member.handle}/`) }
            : { to: loginPath(), label: '로그인', tip: '로그인하고 글쓰기·좋아요·팔로우', icon: _jsx(NavIcon, { name: "me", size: 22 }), active: (p) => p === '/login' },
    ];
    return (_jsx("nav", { className: "mobile-nav", "aria-label": "\uC8FC\uC694 \uBA54\uB274", children: items.map((it) => {
            const on = it.active(path);
            return (_jsxs(Link, { to: it.to, className: on ? 'on' : undefined, "aria-current": on ? 'page' : undefined, "data-tip": it.tip, children: [it.icon, _jsx("span", { children: it.label })] }, it.label));
        }) }));
}
