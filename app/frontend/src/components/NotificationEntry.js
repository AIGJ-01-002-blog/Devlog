import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { messageOf, notificationTime, notificationsApi, notifyChanged } from '../lib/notifications';
import { navigate } from '../lib/router';
import { t } from '../lib/i18n';
/**
 * 알림 한 줄 (종 목록·알림 페이지 공용). 누르면 그 알림만 읽음으로 하고 링크로 간다(FR-028).
 * 볼 수 없는 글이면 링크 없이 읽음만 한다. 안 읽은 알림은 ●와 굵은 글씨(FR-026).
 */
export function NotificationEntry({ item, onRead, onRemove }) {
    const m = messageOf(item);
    const open = () => {
        if (!item.read) {
            onRead(item.id);
            notificationsApi.read(item.id).then(notifyChanged).catch(() => { });
        }
        if (item.link) {
            navigate(item.link);
            window.scrollTo(0, 0);
        }
    };
    return (_jsxs("li", { className: `notification${item.read ? '' : ' unread'}`, children: [_jsxs("button", { type: "button", className: "notification-open", onClick: open, children: [!item.read && _jsxs("span", { className: "notification-dot", children: [_jsx("span", { "aria-hidden": "true", children: "\u25CF" }), _jsx("span", { className: "sr-only", children: t('안 읽음') })] }), _jsxs("span", { className: "notification-body", children: [_jsxs("span", { className: "notification-text", children: [m.who && _jsx("b", { children: m.who }), m.text] }), m.quote && _jsxs("span", { className: "notification-quote", children: ["\u201C", m.quote, "\u201D"] }), _jsx("time", { className: "muted small", dateTime: item.at, children: notificationTime(item.at) })] })] }), onRemove && (_jsx("button", { type: "button", className: "btn btn-text notification-remove", "aria-label": t('알림 삭제'), onClick: () => onRemove(item.id), children: "\u00D7" }))] }));
}
