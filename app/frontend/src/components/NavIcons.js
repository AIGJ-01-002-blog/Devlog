import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/** 머리말·아래 탭·내 메뉴가 같이 쓰는 선 아이콘 (055·063). 크기만 다르고 선 굵기와 모양은 같다. */
function Icon({ size, children }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "nav-icon", children: children }));
}
const PATHS = {
    home: _jsxs(_Fragment, { children: [_jsx("path", { d: "M3 10.5 12 3l9 7.5" }), _jsx("path", { d: "M5 9.5V21h14V9.5" })] }),
    search: _jsxs(_Fragment, { children: [_jsx("circle", { cx: "11", cy: "11", r: "7" }), _jsx("path", { d: "m20 20-3.5-3.5" })] }),
    feed: _jsxs(_Fragment, { children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }), _jsx("path", { d: "M7 9h10M7 13h10M7 17h6" })] }),
    tag: _jsxs(_Fragment, { children: [_jsx("path", { d: "M3 12V4h8l10 10-8 8z" }), _jsx("circle", { cx: "7.5", cy: "8.5", r: "1.5" })] }),
    ai: _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 3v3M12 18v3M3 12h3M18 12h3" }), _jsx("rect", { x: "7", y: "7", width: "10", height: "10", rx: "2" })] }),
    me: _jsxs(_Fragment, { children: [_jsx("circle", { cx: "12", cy: "8", r: "4" }), _jsx("path", { d: "M4 21a8 8 0 0 1 16 0" })] }),
    heart: _jsx("path", { d: "M12 20s-7-4.35-9.2-8.6C1.3 8.5 3 5 6.4 5c2 0 3.6 1.1 4.6 2.6l1 1.4 1-1.4C14 6.1 15.6 5 17.6 5 21 5 22.7 8.5 21.2 11.4 19 15.65 12 20 12 20z" }),
    support: _jsxs(_Fragment, { children: [_jsx("path", { d: "M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.1A8 8 0 1 1 21 12z" }), _jsx("path", { d: "M12 8v4M12 15.5v.01" })] }),
    releases: _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4z" }), _jsx("path", { d: "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" })] }),
    settings: _jsxs(_Fragment, { children: [_jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("path", { d: "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" })] }),
    blog: _jsxs(_Fragment, { children: [_jsx("path", { d: "M4 19.5V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14.5" }), _jsx("path", { d: "M4 19.5A2.5 2.5 0 0 0 6.5 22H20" }), _jsx("path", { d: "M8 7h8M8 11h6" })] }),
    posts: _jsxs(_Fragment, { children: [_jsx("path", { d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" }), _jsx("path", { d: "M14 3v6h6M8 13h8M8 17h5" })] }),
    shield: _jsx("path", { d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" }),
    inbox: _jsxs(_Fragment, { children: [_jsx("path", { d: "M22 12h-6l-2 3h-4l-2-3H2" }), _jsx("path", { d: "M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" })] }),
    logout: _jsxs(_Fragment, { children: [_jsx("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), _jsx("path", { d: "m16 17 5-5-5-5M21 12H9" })] }),
    rss: _jsxs(_Fragment, { children: [_jsx("path", { d: "M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" }), _jsx("circle", { cx: "5", cy: "19", r: "1.5" })] }),
    pen: _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 20h9" }), _jsx("path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" })] }),
    user: _jsxs(_Fragment, { children: [_jsx("path", { d: "M20 21a8 8 0 0 0-16 0" }), _jsx("circle", { cx: "12", cy: "8", r: "4" })] }),
    users: _jsxs(_Fragment, { children: [_jsx("circle", { cx: "9", cy: "8", r: "4" }), _jsx("path", { d: "M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" })] }),
    bell: _jsxs(_Fragment, { children: [_jsx("path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }), _jsx("path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" })] }),
    lock: _jsxs(_Fragment, { children: [_jsx("rect", { x: "4", y: "11", width: "16", height: "10", rx: "2" }), _jsx("path", { d: "M8 11V7a4 4 0 0 1 8 0v4" })] }),
    download: _jsxs(_Fragment, { children: [_jsx("path", { d: "M12 3v12M7 10l5 5 5-5" }), _jsx("path", { d: "M5 21h14" })] }),
    copy: _jsxs(_Fragment, { children: [_jsx("rect", { x: "9", y: "9", width: "12", height: "12", rx: "2" }), _jsx("path", { d: "M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" })] }),
    eye: _jsxs(_Fragment, { children: [_jsx("path", { d: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }),
    comment: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }),
    trash: _jsx(_Fragment, { children: _jsx("path", { d: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" }) }),
};
export function NavIcon({ name, size = 18 }) {
    return _jsx(Icon, { size: size, children: PATHS[name] });
}
