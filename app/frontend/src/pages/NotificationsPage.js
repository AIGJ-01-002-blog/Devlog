import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { InfiniteLoader } from '../components/InfiniteLoader';
import { NotificationEntry } from '../components/NotificationEntry';
import { notificationsApi, notifyChanged } from '../lib/notifications';
import { Link } from '../lib/router';
import { t } from '../lib/i18n';
/** 모든 알림 (015 US3): 20개씩 무한 스크롤(spec 069), 하나씩 [×] 삭제, [모두 읽음]. 보관 기간은 90일. */
export function NotificationsPage() {
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    // 목록 읽기와 따로: 모두 읽음·삭제 실패는 목록을 다시 불러올 일이 아니다
    const [actionError, setActionError] = useState(null);
    useEffect(() => { document.title = t('알림 - devlog'); }, []);
    const more = useCallback(async (from) => {
        setLoading(true);
        setError(false);
        try {
            const page = await notificationsApi.list(from, 20);
            // 사이에 새 알림이 생겨 경계가 밀려도 같은 알림을 두 번 보이지 않는다
            setItems((prev) => {
                const seen = new Set(prev.map((n) => n.id));
                return [...prev, ...page.items.filter((n) => !seen.has(n.id))];
            });
            setCursor(page.nextCursor);
            setDone(page.nextCursor == null);
        }
        catch {
            setError(true);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void more(null); }, [more]);
    const markRead = (id) => setItems((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const remove = async (id) => {
        const before = items;
        setItems((l) => l.filter((n) => n.id !== id));
        setActionError(null);
        try {
            await notificationsApi.remove(id);
            notifyChanged();
        }
        catch {
            setItems(before);
            setActionError(t('알림을 지우지 못했어요'));
        }
    };
    const readAll = async () => {
        setActionError(null);
        try {
            await notificationsApi.readAll();
            setItems((l) => l.map((n) => ({ ...n, read: true })));
            notifyChanged();
        }
        catch {
            setActionError(t('모두 읽음으로 바꾸지 못했어요'));
        }
    };
    return (_jsxs("main", { className: "container narrow", children: [_jsxs("div", { className: "notifications-head", children: [_jsx("h1", { className: "page-title", children: t('알림') }), _jsxs("span", { className: "row", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: readAll, disabled: items.every((n) => n.read), children: t('모두 읽음') }), _jsx(Link, { to: "/settings#notifications", className: "btn btn-text", children: t('알림 설정') })] })] }), actionError && _jsx("p", { className: "error center", role: "alert", children: actionError }), items.length > 0 && (_jsx("ul", { className: "notification-list page", children: items.map((n) => _jsx(NotificationEntry, { item: n, onRead: markRead, onRemove: remove }, n.id)) })), !loading && !error && done && items.length === 0 && _jsx("p", { className: "muted center", children: t('새 알림이 없어요') }), loading && cursor == null && _jsx("p", { className: "muted center", children: t('불러오는 중…') }), _jsx(InfiniteLoader, { hasMore: cursor != null, loading: loading, failed: error, onMore: () => void more(cursor), failedText: t('알림을 불러오지 못했어요') }), _jsx("p", { className: "muted small center", children: t('알림은 90일 동안 보관해요.') })] }));
}
