import { jsx as _jsx } from "react/jsx-runtime";
// 작은 라우터: History API + 경로 패턴. 서버가 같은 주소를 그리므로(SSR 머리말) 주소 규칙은 서버와 같다.
import { useEffect, useState } from 'react';
import { focusMain } from './focusMain';
import { requestPageAnnouncement } from './announcePage';
const listeners = new Set();
export function navigate(to, options = {}) {
    if (options.replace)
        history.replaceState(null, '', to);
    else
        history.pushState(null, '', to);
    listeners.forEach((l) => l());
}
/** 페이지를 떠나기 전에 확인할 것(미저장 변경 등). false를 돌려주면 이동을 막는다. */
let leaveGuard = null;
export function setLeaveGuard(guard) {
    leaveGuard = guard;
}
export function useLocation() {
    const [, force] = useState(0);
    useEffect(() => {
        const l = () => force((n) => n + 1);
        listeners.add(l);
        window.addEventListener('popstate', l);
        return () => {
            listeners.delete(l);
            window.removeEventListener('popstate', l);
        };
    }, []);
    return { path: location.pathname, search: new URLSearchParams(location.search) };
}
export function match(pattern, path) {
    const names = [];
    const re = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, n) => {
        names.push(n);
        return '([^/]+)';
    }) + '/?$');
    const m = path.match(re);
    if (!m)
        return null;
    const params = {};
    names.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])));
    return params;
}
export function Link({ to, children, onClick, ...rest }) {
    const handle = (e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
            return;
        if (rest.target === '_blank')
            return;
        e.preventDefault();
        if (leaveGuard && !leaveGuard())
            return;
        navigate(to);
        requestPageAnnouncement();
        window.scrollTo(0, 0);
        // 본문 자리는 화면을 불러오는 동안에도 남아 있으므로, 불러오는 중이어도 초점이 새 화면으로 이어진다
        requestAnimationFrame(() => focusMain());
    };
    return (_jsx("a", { href: to, onClick: handle, ...rest, children: children }));
}
