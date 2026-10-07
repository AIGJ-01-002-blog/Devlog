import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { badgeLabel, badgeText, notificationsApi, notifyChanged, onNotificationsChanged, POLL_MS, } from '../lib/notifications';
import { Link } from '../lib/router';
import { NotificationEntry } from './NotificationEntry';
/**
 * 헤더 종 (015 US2). 안 읽은 개수를 30초마다 다시 세고, 탭이 가려져 있으면 쉬었다가 다시 보이면 바로 센다(FR-027).
 * 세기에 실패하면 마지막 배지를 그대로 둔다. 열 때마다 최근 10개를 새로 읽는다.
 */
export function NotificationBell() {
    const [count, setCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [list, setList] = useState({ kind: 'loading' });
    const ref = useRef(null);
    const refreshCount = useCallback(() => {
        notificationsApi.unreadCount().then(setCount).catch(() => { });
    }, []);
    useEffect(() => {
        refreshCount();
        let timer;
        const start = () => {
            window.clearInterval(timer);
            timer = window.setInterval(refreshCount, POLL_MS);
        };
        const onVisibility = () => {
            if (document.hidden) {
                window.clearInterval(timer);
            }
            else {
                refreshCount();
                start();
            }
        };
        if (!document.hidden)
            start();
        document.addEventListener('visibilitychange', onVisibility);
        const off = onNotificationsChanged(refreshCount);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
            off();
        };
    }, [refreshCount]);
    const load = useCallback(() => {
        setList({ kind: 'loading' });
        notificationsApi.list(null, 10).then((p) => setList({ kind: 'ok', items: p.items })).catch(() => setList({ kind: 'error' }));
    }, []);
    useEffect(() => {
        if (!open)
            return;
        load();
        const close = (e) => {
            if (!ref.current?.contains(e.target))
                setOpen(false);
        };
        const esc = (e) => {
            if (e.key === 'Escape')
                setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', esc);
        };
    }, [open, load]);
    const markRead = (id) => {
        setList((l) => (l.kind === 'ok' ? { kind: 'ok', items: l.items.map((n) => (n.id === id ? { ...n, read: true } : n)) } : l));
        setCount((c) => Math.max(0, c - 1));
        setOpen(false);
    };
    const readAll = async () => {
        try {
            await notificationsApi.readAll();
            setList((l) => (l.kind === 'ok' ? { kind: 'ok', items: l.items.map((n) => ({ ...n, read: true })) } : l));
            notifyChanged();
        }
        catch {
            // 다음 세기에서 맞춰진다
        }
    };
    const badge = badgeText(count);
    return (_jsxs("div", { className: "menu notification-bell", ref: ref, children: [_jsxs("button", { type: "button", className: "btn btn-text bell-button", "aria-haspopup": "dialog", "aria-expanded": open, "aria-label": badgeLabel(count), onClick: () => setOpen((o) => !o), children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }), _jsx("path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" })] }), badge && _jsx("span", { className: "bell-badge", "aria-hidden": "true", children: badge })] }), open && (_jsxs("div", { className: "menu-list notification-panel", role: "dialog", "aria-label": "\uC54C\uB9BC", children: [_jsxs("div", { className: "notification-panel-head", children: [_jsx("b", { children: "\uC54C\uB9BC" }), _jsx("button", { type: "button", className: "btn btn-text small", onClick: readAll, disabled: list.kind !== 'ok' || list.items.every((n) => n.read), children: "\uBAA8\uB450 \uC77D\uC74C" })] }), list.kind === 'loading' && _jsx("p", { className: "muted center small notification-state", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }), list.kind === 'error' && (_jsxs("p", { className: "error center small notification-state", children: ["\uC54C\uB9BC\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694 ", _jsx("button", { type: "button", className: "btn btn-text small", onClick: load, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] })), list.kind === 'ok' && (list.items.length === 0
                        ? _jsx("p", { className: "muted center small notification-state", children: "\uC0C8 \uC54C\uB9BC\uC774 \uC5C6\uC5B4\uC694" })
                        : _jsx("ul", { className: "notification-list", children: list.items.map((n) => _jsx(NotificationEntry, { item: n, onRead: markRead }, n.id)) })), _jsx(Link, { to: "/notifications", className: "notification-all", onClick: () => setOpen(false), children: "\uBAA8\uB4E0 \uC54C\uB9BC \uBCF4\uAE30" })] }))] }));
}
