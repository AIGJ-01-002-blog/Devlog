import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { loginPath, useAuth } from '../lib/auth';
import { Link, navigate, useLocation } from '../lib/router';
import { Avatar } from './Avatar';
import { NavIcon } from './NavIcons';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
/**
 * 머리말 메뉴 (062). 순서는 "피드 · 좋아한 글 · 태그 · 문의·신고 · 릴리스 노트 · 🔔"(민서님 요청).
 * 넓은 화면은 아이콘과 이름을, 중간 화면(641~1180px)은 아이콘만 보이고 툴팁으로 이름을 알린다.
 * 휴대폰(640px 이하)은 아래 탭과 내 메뉴가 같은 곳으로 데려간다.
 */
export function headerItems(path) {
    return [
        { to: '/feed', label: '피드', tip: '팔로우한 사람의 새 글', icon: 'feed', on: (p) => p === '/feed', memberOnly: true },
        { to: '/lists/liked', label: '좋아한 글', tip: '내가 좋아요를 누른 글', icon: 'heart', on: (p) => p === '/lists/liked', memberOnly: true },
        { to: '/tags', label: '태그', tip: '태그별로 글 모아 보기', icon: 'tag', on: (p) => p === '/tags' || p.startsWith('/tags/') },
        // 지금 화면 주소를 함께 넘겨 버그가 난 곳을 남긴다 (054)
        { to: path.startsWith('/support') ? '/support' : `/support?from=${encodeURIComponent(path)}`, label: '문의·신고',
            tip: '궁금한 점·버그·제안을 운영자에게 보내요', icon: 'support', on: (p) => p === '/support' },
        { to: '/releases', label: '릴리스 노트', tip: '버전마다 바뀐 점을 봐요', icon: 'releases', on: (p) => p === '/releases' },
    ];
}
export function Header() {
    const { me, logout } = useAuth();
    const { path } = useLocation();
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const close = (e) => {
            if (!menuRef.current?.contains(e.target))
                setOpen(false);
        };
        const esc = (e) => { if (e.key === 'Escape')
            setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', esc);
        };
    }, [open]);
    const member = me?.member;
    const items = headerItems(path).filter((it) => member || !it.memberOnly);
    // 휴대폰에서는 머리말 메뉴가 숨으니 아래 탭에 없는 것(좋아한 글·문의·신고·릴리스 노트)을 내 메뉴 아래에 둔다
    const mobileExtra = items.filter((it) => it.icon !== 'feed' && it.icon !== 'tag');
    return (_jsx("header", { className: "site-header", children: _jsxs("div", { className: "container header-inner", children: [_jsxs(Link, { to: "/", className: "logo", "data-tip": "\uCCAB \uD654\uBA74\uC73C\uB85C", children: [_jsx("span", { className: "logo-mark", "aria-hidden": "true" }), "devlog"] }), _jsxs("nav", { className: "header-actions", "aria-label": "\uBA38\uB9AC\uB9D0 \uBA54\uB274", children: [_jsx(Link, { to: "/search", className: "btn btn-text header-search header-nav", "aria-label": "\uAC80\uC0C9", "data-tip": "\uAE00\u00B7\uC0AC\uB78C \uAC80\uC0C9", children: _jsx(NavIcon, { name: "search" }) }), _jsx(Link, { to: "/mcp", className: "btn btn-text header-mcp", "data-tip": "Claude\u00B7ChatGPT \uAC19\uC740 AI \uB3C4\uAD6C\uC5D0 devlog \uC5F0\uACB0\uD558\uAE30", children: "AI \uC5F0\uACB0" }), _jsx("span", { className: "header-sep header-nav", "aria-hidden": "true" }), items.map((it) => {
                            const on = it.on(path);
                            return (_jsxs(Link, { to: it.to, className: `btn btn-text header-nav header-link${on ? ' on' : ''}`, "aria-current": on ? 'page' : undefined, "aria-label": it.label, "data-tip": it.tip, children: [_jsx(NavIcon, { name: it.icon }), _jsx("span", { className: "header-label", children: it.label })] }, it.icon));
                        }), member ? (_jsxs(_Fragment, { children: [_jsx(NotificationBell, {}), _jsxs(Link, { to: "/write", className: "btn btn-outline header-write", "aria-label": "\uC0C8 \uAE00 \uC791\uC131", "data-tip": "\uC0C8 \uAE00 \uC4F0\uAE30", children: [_jsx("span", { className: "long", children: "\uC0C8 \uAE00 \uC791\uC131" }), _jsx("span", { className: "short", "aria-hidden": "true", children: "\uAE00\uC4F0\uAE30" }), _jsx("span", { className: "icon", "aria-hidden": "true", children: "\u270F\uFE0F" })] }), _jsxs("div", { className: "menu", ref: menuRef, children: [_jsxs("button", { type: "button", className: "menu-button", "aria-haspopup": "menu", "aria-expanded": open, "data-tip": "\uB0B4 \uBA54\uB274: \uB0B4 \uC124\uC815\u00B7\uB0B4 \uBE14\uB85C\uADF8\u00B7\uAE00 \uAD00\uB9AC\u00B7\uB85C\uADF8\uC544\uC6C3", onClick: () => setOpen((o) => !o), children: [_jsx(Avatar, { src: member.profileImageUrl, name: member.nickname, seed: member.handle }), _jsx("span", { className: "sr-only", children: "\uB0B4 \uBA54\uB274" })] }), open && (_jsxs("div", { className: "menu-list profile-menu", role: "menu", onClick: () => setOpen(false), children: [_jsxs("div", { className: "menu-who", children: [_jsx(Avatar, { src: member.profileImageUrl, name: member.nickname, seed: member.handle, size: 40 }), _jsxs("span", { children: [_jsx("b", { children: member.nickname }), _jsxs("span", { className: "muted", children: ["@", member.handle] })] })] }), _jsxs(Link, { to: "/settings", role: "menuitem", children: [_jsx(NavIcon, { name: "settings" }), "\uB0B4 \uC124\uC815"] }), _jsxs(Link, { to: `/@${member.handle}`, role: "menuitem", children: [_jsx(NavIcon, { name: "blog" }), "\uB0B4 \uBE14\uB85C\uADF8"] }), _jsxs(Link, { to: "/manage/posts", role: "menuitem", children: [_jsx(NavIcon, { name: "posts" }), "\uB0B4 \uAE00 \uAD00\uB9AC"] }), _jsxs("div", { className: "menu-mobile-only", children: [_jsx("div", { className: "menu-sep", role: "separator" }), mobileExtra.map((it) => _jsxs(Link, { to: it.to, role: "menuitem", children: [_jsx(NavIcon, { name: it.icon }), it.label] }, it.icon))] }), member.role === 'ADMIN' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "menu-sep", role: "separator" }), _jsxs(Link, { to: "/admin/reports", role: "menuitem", children: [_jsx(NavIcon, { name: "shield" }), "\uC2E0\uACE0 \uAD00\uB9AC"] }), _jsxs(Link, { to: "/admin/inquiries", role: "menuitem", children: [_jsx(NavIcon, { name: "inbox" }), "\uBB38\uC758 \uAD00\uB9AC"] })] })), _jsx("div", { className: "menu-sep", role: "separator" }), _jsxs("button", { type: "button", role: "menuitem", onClick: async () => {
                                                        await logout();
                                                        navigate('/');
                                                    }, children: [_jsx(NavIcon, { name: "logout" }), "\uB85C\uADF8\uC544\uC6C3"] })] }))] })] })) : (_jsx(Link, { to: loginPath(), className: "btn btn-dark", "data-tip": "\uB85C\uADF8\uC778\uD558\uACE0 \uAE00\uC4F0\uAE30\u00B7\uC88B\uC544\uC694\u00B7\uD314\uB85C\uC6B0", children: "\uB85C\uADF8\uC778" })), _jsx(ThemeToggle, {})] })] }) }));
}
