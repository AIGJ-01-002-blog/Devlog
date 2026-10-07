import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { loginPath, useAuth } from '../lib/auth';
import { Link, navigate } from '../lib/router';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
export function Header() {
    const { me, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const close = (e) => {
            if (!menuRef.current?.contains(e.target))
                setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);
    const member = me?.member;
    return (_jsx("header", { className: "site-header", children: _jsxs("div", { className: "container header-inner", children: [_jsx(Link, { to: "/", className: "logo", children: "devlog" }), _jsxs("nav", { className: "header-actions", children: [_jsx(Link, { to: "/search", className: "btn btn-text header-search", "aria-label": "\uAC80\uC0C9", children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", children: [_jsx("circle", { cx: "11", cy: "11", r: "7" }), _jsx("path", { d: "m20 20-3.5-3.5" })] }) }), member && _jsx(Link, { to: "/feed", className: "btn btn-text", children: "\uD53C\uB4DC" }), _jsx(Link, { to: "/tags", className: "btn btn-text", children: "\uD0DC\uADF8" }), member ? (_jsxs(_Fragment, { children: [_jsx(NotificationBell, {}), _jsxs(Link, { to: "/write", className: "btn btn-outline header-write", "aria-label": "\uC0C8 \uAE00 \uC791\uC131", children: [_jsx("span", { className: "long", children: "\uC0C8 \uAE00 \uC791\uC131" }), _jsx("span", { className: "short", "aria-hidden": "true", children: "\uAE00\uC4F0\uAE30" })] }), _jsxs("div", { className: "menu", ref: menuRef, children: [_jsxs("button", { type: "button", className: "menu-button", "aria-haspopup": "menu", "aria-expanded": open, onClick: () => setOpen((o) => !o), children: [_jsx(Avatar, { src: member.profileImageUrl, name: member.nickname, seed: member.handle }), _jsx("span", { className: "sr-only", children: "\uB0B4 \uBA54\uB274" })] }), open && (_jsxs("div", { className: "menu-list", role: "menu", onClick: () => setOpen(false), children: [_jsxs("div", { className: "menu-who", children: [member.nickname, " ", _jsxs("span", { className: "muted", children: ["@", member.handle] })] }), _jsx(Link, { to: `/@${member.handle}`, role: "menuitem", children: "\uB0B4 \uBE14\uB85C\uADF8" }), _jsx(Link, { to: "/manage/posts", role: "menuitem", children: "\uB0B4 \uAE00 \uAD00\uB9AC" }), _jsx(Link, { to: "/notifications", role: "menuitem", children: "\uC54C\uB9BC" }), _jsx(Link, { to: "/settings", role: "menuitem", children: "\uC124\uC815" }), member.role === 'ADMIN' && _jsx(Link, { to: "/admin/reports", role: "menuitem", children: "\uC2E0\uACE0 \uAD00\uB9AC" }), _jsx("button", { type: "button", role: "menuitem", onClick: async () => {
                                                        await logout();
                                                        navigate('/');
                                                    }, children: "\uB85C\uADF8\uC544\uC6C3" })] }))] })] })) : (_jsx(Link, { to: loginPath(), className: "btn btn-dark", children: "\uB85C\uADF8\uC778" })), _jsx(ThemeToggle, {})] })] }) }));
}
