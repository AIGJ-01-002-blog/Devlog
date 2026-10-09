import { messageOf, notificationTime, notificationsApi, notifyChanged, type NotificationItem } from '../lib/notifications'
import { navigate } from '../lib/router'

/**
 * 알림 한 줄 (종 목록·알림 페이지 공용). 누르면 그 알림만 읽음으로 하고 링크로 간다(FR-028).
 * 볼 수 없는 글이면 링크 없이 읽음만 한다. 안 읽은 알림은 ●와 굵은 글씨(FR-026).
 */
export function NotificationEntry({ item, onRead, onRemove }: {
  item: NotificationItem
  onRead: (id: number) => void
  onRemove?: (id: number) => void
}) {
  const m = messageOf(item)
  const open = () => {
    if (!item.read) {
      onRead(item.id)
      notificationsApi.read(item.id).then(notifyChanged).catch(() => {})
    }
    if (item.link) {
      navigate(item.link)
      window.scrollTo(0, 0)
    }
  }
  return (
    <li className={`notification${item.read ? '' : ' unread'}`}>
      <button type="button" className="notification-open" onClick={open}>
        {!item.read && <span className="notification-dot"><span aria-hidden="true">●</span><span className="sr-only">안 읽음</span></span>}
        <span className="notification-body">
          <span className="notification-text">{m.who && <b>{m.who}</b>}{m.text}</span>
          {m.quote && <span className="notification-quote">“{m.quote}”</span>}
          <time className="muted small" dateTime={item.at}>{notificationTime(item.at)}</time>
        </span>
      </button>
      {onRemove && (
        <button type="button" className="btn btn-text notification-remove" aria-label="알림 삭제" onClick={() => onRemove(item.id)}>×</button>
      )}
    </li>
  )
}
