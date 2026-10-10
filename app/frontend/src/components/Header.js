import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { isStaff } from '../lib/admin';
import { loginPath, useAuth } from '../lib/auth';
import { Link, navigate, useLocation } from '../lib/router';
import { Avatar } from './Avatar';
import { NavIcon } from './NavIcons';
import { NotificationBell } from './NotificationBell';
import { LanguageMenu } from './LanguageMenu';
import { ThemeToggle } from './ThemeToggle';
import { t } from '../lib/i18n';
/**
 * 머리말 메뉴 (063, 072). 회원은 "피드 · 좋아한 글 · 태그 · 🔔"이고 문의·신고·릴리스 노트는 내 메뉴에 있다(072 시안).
 * 비회원은 내 메뉴가 없어 문의·신고·릴리스 노트를 머리말에 아이콘으로 둔다.
 * 넓은 화면은 아이콘과 이름을, 중간 화면(641~1180px)은 아이콘만 보이고 툴팁으로 이름을 알린다.
 * 휴대폰(640px 이하)은 아래 탭과 내 메뉴가 같은 곳으로 데려간다.
 */
export function headerItems(path) {
    return [
        { to: '/feed', label: t('피드'), tip: t('팔로우한 사람의 새 글'), icon: 'feed', on: (p) => p === '/feed', memberOnly: true },
        { to: '/lists/liked', label: t('좋아한 글'), tip: t('내가 좋아요를 누른 글'), icon: 'heart', on: (p) => p === '/lists/liked', memberOnly: true },
        { to: '/tags', label: t('태그'), tip: t('태그별로 글 모아 보기'), icon: 'tag', on: (p) => p === '/tags' || p.startsWith('/tags/') },
        // 지금 화면 주소를 함께 넘겨 버그가 난 곳을 남긴다 (054)
        { to: path.startsWith('/support') ? '/support' : `/support?from=${encodeURIComponent(path)}`, label: t('문의·신고'),
            tip: t('궁금한 점·버그·제안을 운영자에게 보내요'), icon: 'support', on: (p) => p === '/support', inMenu: true },
        { to: '/releases', label: t('릴리스 노트'), tip: t('버전마다 바뀐 점을 봐요'), icon: 'releases', on: (p) => p === '/releases', inMenu: true },
    ];
}
export function Header() {
    const { me, logout } = useAuth();
    const { path } = useLocation();
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        // 열리면 첫 항목으로 초점을 옮긴다 (WAI-ARIA menu button)
        menuItems()[0]?.focus();
        const close = (e) => {
            if (!menuRef.current?.contains(e.target))
                setOpen(false);
        };
        const esc = (e) => {
            if (e.key !== 'Escape')
                return;
            setOpen(false);
            buttonRef.current?.focus();
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', esc);
        };
    }, [open]);
    const menuItems = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])]
        .filter((el) => {
        // 넓은 화면에서 숨긴 휴대폰 전용 항목은 건너뛴다
        const box = el.closest('.menu-mobile-only');
        return !box || getComputedStyle(box).display !== 'none';
    });
    const onMenuKey = (e) => {
        const items = menuItems();
        if (items.length === 0)
            return;
        const i = items.indexOf(document.activeElement);
        let next;
        if (e.key === 'ArrowDown')
            next = i < 0 ? 0 : (i + 1) % items.length;
        else if (e.key === 'ArrowUp')
            next = i <= 0 ? items.length - 1 : i - 1;
        else if (e.key === 'Home')
            next = 0;
        else if (e.key === 'End')
            next = items.length - 1;
        else
            return;
        e.preventDefault();
        items[next].focus();
    };
    const onLogout = async () => {
        try {
            await logout();
            navigate('/');
        }
        catch {
            alert(t('로그아웃하지 못했어요. 잠시 뒤 다시 시도해 주세요.'));
        }
    };
    const member = me?.member;
    const all = headerItems(path).filter((it) => member || !it.memberOnly);
    const items = all.filter((it) => !member || !it.inMenu);
    // 회원의 문의·신고·릴리스 노트는 늘 내 메뉴에 있다
    const menuExtra = all.filter((it) => member && it.inMenu);
    // 휴대폰에서는 머리말 메뉴가 숨으니 아래 탭에 없는 좋아한 글도 내 메뉴 아래에 둔다
    const mobileExtra = items.filter((it) => it.icon !== 'feed' && it.icon !== 'tag');
    return (_jsx("header", { className: "site-header", children: _jsxs("div", { className: "container header-inner", children: [_jsxs(Link, { to: "/", className: "logo", "data-tip": t('첫 화면으로'), children: [_jsx("span", { className: "logo-mark", "aria-hidden": "true" }), "devlog"] }), _jsxs("nav", { className: "header-actions", "aria-label": t('머리말 메뉴'), children: [_jsx(Link, { to: "/search", className: "btn btn-text header-search header-nav", "aria-label": t('검색'), "data-tip": t('글·사람 검색'), children: _jsx(NavIcon, { name: "search" }) }), _jsx(Link, { to: "/mcp", className: "btn btn-text header-mcp", "data-tip": t('Claude·ChatGPT 같은 AI 도구에 devlog 연결하기'), children: t('AI 연결') }), _jsx("span", { className: "header-sep header-nav", "aria-hidden": "true" }), items.map((it) => {
                            const on = it.on(path);
                            return (_jsxs(Link, { to: it.to, className: `btn btn-text header-nav header-link${on ? ' on' : ''}`, "aria-current": on ? 'page' : undefined, "aria-label": it.label, "data-tip": it.tip, children: [_jsx(NavIcon, { name: it.icon }), _jsx("span", { className: "header-label", children: it.label })] }, it.icon));
                        }), member ? (_jsxs(_Fragment, { children: [isStaff(member.role) && (_jsx(Link, { to: "/admin", className: `btn btn-text header-admin header-nav header-link${path.startsWith('/admin') ? ' on' : ''}`, "aria-label": t('관리자 페이지'), "data-tip": t('관리자 페이지: 통계·글·회원·신고 관리'), "aria-current": path.startsWith('/admin') ? 'page' : undefined, children: _jsx(NavIcon, { name: "shield" }) })), _jsx(NotificationBell, {}), _jsxs(Link, { to: "/write", className: "btn btn-outline header-write", "aria-label": t('새 글 작성'), "data-tip": t('새 글 쓰기'), children: [_jsx("span", { className: "long", children: t('새 글 작성') }), _jsx("span", { className: "short", "aria-hidden": "true", children: t('글쓰기') }), _jsx("span", { className: "icon", "aria-hidden": "true", children: "\u270F\uFE0F" })] }), _jsxs("div", { className: "menu", ref: menuRef, onBlur: (e) => {
                                        // 초점이 메뉴 밖의 다른 요소로 옮겨 가면 닫는다 (빈 곳 클릭은 mousedown이 맡는다)
                                        if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget))
                                            setOpen(false);
                                    }, children: [_jsxs("button", { type: "button", ref: buttonRef, className: "menu-button", "aria-haspopup": "menu", "aria-expanded": open, "data-tip": t('내 메뉴: 내 설정·내 블로그·글 관리·로그아웃'), onClick: () => setOpen((o) => !o), children: [_jsx(Avatar, { src: member.profileImageUrl, name: member.nickname, seed: member.handle }), _jsx("span", { className: "sr-only", children: t('내 메뉴') })] }), open && (_jsxs("div", { className: "menu-list profile-menu", role: "menu", "aria-label": t('내 메뉴'), onClick: () => setOpen(false), onKeyDown: onMenuKey, children: [_jsxs("div", { className: "menu-who", role: "none", children: [_jsx(Avatar, { src: member.profileImageUrl, name: member.nickname, seed: member.handle, size: 40 }), _jsxs("span", { children: [_jsx("b", { children: member.nickname }), _jsxs("span", { className: "muted", children: ["@", member.handle] })] })] }), _jsxs(Link, { to: "/settings", role: "menuitem", children: [_jsx(NavIcon, { name: "settings" }), t('내 설정')] }), _jsxs(Link, { to: `/@${member.handle}`, role: "menuitem", children: [_jsx(NavIcon, { name: "blog" }), t('내 블로그')] }), _jsxs(Link, { to: "/manage/posts", role: "menuitem", children: [_jsx(NavIcon, { name: "posts" }), t('내 글 관리')] }), mobileExtra.length > 0 && (_jsxs("div", { className: "menu-mobile-only", role: "none", children: [_jsx("div", { className: "menu-sep", role: "separator" }), mobileExtra.map((it) => _jsxs(Link, { to: it.to, role: "menuitem", children: [_jsx(NavIcon, { name: it.icon }), it.label] }, it.icon))] })), _jsx("div", { className: "menu-sep", role: "separator" }), menuExtra.map((it) => _jsxs(Link, { to: it.to, role: "menuitem", children: [_jsx(NavIcon, { name: it.icon }), it.label] }, it.icon)), isStaff(member.role) && (_jsxs(_Fragment, { children: [_jsx("div", { className: "menu-sep", role: "separator" }), _jsxs(Link, { to: "/admin", role: "menuitem", title: t('통계·글·회원·신고·문의 관리'), children: [_jsx(NavIcon, { name: "shield" }), t('관리자 페이지')] })] })), _jsx("div", { className: "menu-sep", role: "separator" }), _jsxs("button", { type: "button", role: "menuitem", onClick: () => void onLogout(), children: [_jsx(NavIcon, { name: "logout" }), t('로그아웃')] })] }))] })] })) : (_jsx(Link, { to: loginPath(), className: "btn btn-dark", "data-tip": t('로그인하고 글쓰기·좋아요·팔로우'), children: t('로그인') })), _jsx(LanguageMenu, {}), _jsx(ThemeToggle, {})] })] }) }));
}
