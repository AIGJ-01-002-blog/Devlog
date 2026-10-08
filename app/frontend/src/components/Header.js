import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { loginPath, useAuth } from '../lib/auth';
import { Link, navigate, useLocation } from '../lib/router';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
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
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);
    const member = me?.member;
    return (_jsx("header", { className: "site-header", children: _jsxs("div", { className: "container header-inner", children: [_jsxs(Link, { to: "/", className: "logo", "data-tip": "\uCCAB \uD654\uBA74\uC73C\uB85C", children: [_jsx("span", { className: "logo-mark", "aria-hidden": "true" }), "devlog"] }), _jsxs("nav", { className: "header-actions", children: [_jsx(Link, { to: "/search", className: "btn btn-text header-search header-nav", "aria-label": "\uAC80\uC0C9", "data-tip": "\uAE00\u00B7\uC0AC\uB78C \uAC80\uC0C9", children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", children: [_jsx("circle", { cx: "11", cy: "11", r: "7" }), _jsx("path", { d: "m20 20-3.5-3.5" })] }) }), _jsx(Link, { to: "/mcp", className: "btn btn-text header-mcp", "data-tip": "Claude\u00B7ChatGPT \uAC19\uC740 AI \uB3C4\uAD6C\uC5D0 devlog \uC5F0\uACB0\uD558\uAE30", children: "AI \uC5F0\uACB0" }), member && _jsx(Link, { to: "/feed", className: "btn btn-text header-nav", "data-tip": "\uD314\uB85C\uC6B0\uD55C \uC0AC\uB78C\uC758 \uC0C8 \uAE00", children: "\uD53C\uB4DC" }), _jsx(Link, { to: "/tags", className: "btn btn-text header-nav", "data-tip": "\uD0DC\uADF8\uBCC4\uB85C \uAE00 \uBAA8\uC544 \uBCF4\uAE30", children: "\uD0DC\uADF8" }), member ? (_jsxs(_Fragment, { children: [_jsx(NotificationBell, {}), _jsxs(Link, { to: "/write", className: "btn btn-outline header-write", "aria-label": "\uC0C8 \uAE00 \uC791\uC131", "data-tip": "\uC0C8 \uAE00 \uC4F0\uAE30", children: [_jsx("span", { className: "long", children: "\uC0C8 \uAE00 \uC791\uC131" }), _jsx("span", { className: "short", "aria-hidden": "true", children: "\uAE00\uC4F0\uAE30" }), _jsx("span", { className: "icon", "aria-hidden": "true", children: "\u270F\uFE0F" })] }), _jsxs("div", { className: "menu", ref: menuRef, children: [_jsxs("button", { type: "button", className: "menu-button", "aria-haspopup": "menu", "aria-expanded": open, "data-tip": "\uB0B4 \uBA54\uB274: \uB0B4 \uBE14\uB85C\uADF8\u00B7\uAE00 \uAD00\uB9AC\u00B7\uC124\uC815\u00B7\uB85C\uADF8\uC544\uC6C3", onClick: () => setOpen((o) => !o), children: [_jsx(Avatar, { src: member.profileImageUrl, name: member.nickname, seed: member.handle }), _jsx("span", { className: "sr-only", children: "\uB0B4 \uBA54\uB274" })] }), open && (_jsxs("div", { className: "menu-list", role: "menu", onClick: () => setOpen(false), children: [_jsxs("div", { className: "menu-who", children: [member.nickname, " ", _jsxs("span", { className: "muted", children: ["@", member.handle] })] }), _jsx(Link, { to: `/@${member.handle}`, role: "menuitem", children: "\uB0B4 \uBE14\uB85C\uADF8" }), _jsx(Link, { to: "/manage/posts", role: "menuitem", children: "\uB0B4 \uAE00 \uAD00\uB9AC" }), _jsx(Link, { to: "/lists/liked", role: "menuitem", children: "\uC88B\uC544\uD55C \uAE00" }), _jsx(Link, { to: "/notifications", role: "menuitem", children: "\uC54C\uB9BC" }), _jsx(Link, { to: "/settings", role: "menuitem", children: "\uC124\uC815" }), _jsx(Link, { to: path.startsWith('/support') ? '/support' : `/support?from=${encodeURIComponent(path)}`, role: "menuitem", title: "\uAD81\uAE08\uD55C \uC810\u00B7\uBC84\uADF8\u00B7\uC81C\uC548\uC744 \uC6B4\uC601\uC790\uC5D0\uAC8C \uBCF4\uB0B4\uC694", children: "\uBB38\uC758\u00B7\uC2E0\uACE0" }), _jsx(Link, { to: "/releases", role: "menuitem", title: "\uBC84\uC804\uB9C8\uB2E4 \uBC14\uB010 \uC810\uC744 \uBD10\uC694", children: "\uB9B4\uB9AC\uC2A4 \uB178\uD2B8" }), member.role === 'ADMIN' && _jsx(Link, { to: "/admin/reports", role: "menuitem", children: "\uC2E0\uACE0 \uAD00\uB9AC" }), member.role === 'ADMIN' && _jsx(Link, { to: "/admin/inquiries", role: "menuitem", children: "\uBB38\uC758 \uAD00\uB9AC" }), _jsx("button", { type: "button", role: "menuitem", onClick: async () => {
                                                        await logout();
                                                        navigate('/');
                                                    }, children: "\uB85C\uADF8\uC544\uC6C3" })] }))] })] })) : (_jsx(Link, { to: loginPath(), className: "btn btn-dark", "data-tip": "\uB85C\uADF8\uC778\uD558\uACE0 \uAE00\uC4F0\uAE30\u00B7\uC88B\uC544\uC694\u00B7\uD314\uB85C\uC6B0", children: "\uB85C\uADF8\uC778" })), _jsx(ThemeToggle, {})] })] }) }));
}
