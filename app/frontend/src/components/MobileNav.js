import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { loginPath, useAuth } from '../lib/auth';
import { Link } from '../lib/router';
/** 아이콘 선 굵기와 크기를 머리말 검색·알림 아이콘과 맞춘다 */
function Icon({ children }) {
    return (_jsx("svg", { width: "22", height: "22", viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: children }));
}
const HOME = _jsxs(Icon, { children: [_jsx("path", { d: "M3 10.5 12 3l9 7.5" }), _jsx("path", { d: "M5 9.5V21h14V9.5" })] });
const SEARCH = _jsxs(Icon, { children: [_jsx("circle", { cx: "11", cy: "11", r: "7" }), _jsx("path", { d: "m20 20-3.5-3.5" })] });
const FEED = _jsxs(Icon, { children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }), _jsx("path", { d: "M7 9h10M7 13h10M7 17h6" })] });
const TAG = _jsxs(Icon, { children: [_jsx("path", { d: "M3 12V4h8l10 10-8 8z" }), _jsx("circle", { cx: "7.5", cy: "8.5", r: "1.5" })] });
const AI = _jsxs(Icon, { children: [_jsx("path", { d: "M12 3v3M12 18v3M3 12h3M18 12h3" }), _jsx("rect", { x: "7", y: "7", width: "10", height: "10", rx: "2" })] });
const ME = _jsxs(Icon, { children: [_jsx("circle", { cx: "12", cy: "8", r: "4" }), _jsx("path", { d: "M4 21a8 8 0 0 1 16 0" })] });
/**
 * 좁은 화면(640px 이하)의 아래 탭 (spec 055). 머리말에 다 들어가지 않던 검색·피드·태그·AI 연결을
 * 엄지가 닿는 자리로 옮기고, 터치에는 툴팁이 없으니 아이콘 아래에 이름을 늘 보인다. 넓은 화면에서는 CSS로 숨긴다.
 */
export function MobileNav({ path }) {
    const { me } = useAuth();
    const member = me?.member;
    const items = [
        { to: '/', label: '홈', tip: '최신·트렌딩 글', icon: HOME, active: (p) => p === '/' },
        member
            ? { to: '/feed', label: '피드', tip: '팔로우한 사람의 새 글', icon: FEED, active: (p) => p === '/feed' }
            : { to: '/mcp', label: 'AI 연결', tip: 'AI 도구에 devlog 연결하기', icon: AI, active: (p) => p === '/mcp' },
        { to: '/search', label: '검색', tip: '글·사람 검색', icon: SEARCH, active: (p) => p === '/search' },
        { to: '/tags', label: '태그', tip: '태그별로 글 모아 보기', icon: TAG, active: (p) => p === '/tags' || p.startsWith('/tags/') },
        member
            ? { to: `/@${member.handle}`, label: '내 블로그', tip: '내 블로그로 가기', icon: ME, active: (p) => p === `/@${member.handle}` || p.startsWith(`/@${member.handle}/`) }
            : { to: loginPath(), label: '로그인', tip: '로그인하고 글쓰기·좋아요·팔로우', icon: ME, active: (p) => p === '/login' },
    ];
    return (_jsx("nav", { className: "mobile-nav", "aria-label": "\uC8FC\uC694 \uBA54\uB274", children: items.map((it) => {
            const on = it.active(path);
            return (_jsxs(Link, { to: it.to, className: on ? 'on' : undefined, "aria-current": on ? 'page' : undefined, "data-tip": it.tip, children: [it.icon, _jsx("span", { children: it.label })] }, it.label));
        }) }));
}
