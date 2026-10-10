import { useCallback, useEffect, useRef, useState } from 'react'
import {
  badgeLabel, badgeText, notificationsApi, notifyChanged, onNotificationsChanged, POLL_MS, type NotificationItem,
} from '../lib/notifications'
import { Link } from '../lib/router'
import { NotificationEntry } from './NotificationEntry'
import { t } from '../lib/i18n'

type ListState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; items: NotificationItem[] }

/**
 * 헤더 종 (015 US2). 안 읽은 개수를 30초마다 다시 세고, 탭이 가려져 있으면 쉬었다가 다시 보이면 바로 센다(FR-027).
 * 세기에 실패하면 마지막 배지를 그대로 둔다. 열 때마다 최근 10개를 새로 읽는다.
 */
export function NotificationBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<ListState>({ kind: 'loading' })
  const [readAllFailed, setReadAllFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const refreshCount = useCallback(() => {
    notificationsApi.unreadCount().then(setCount).catch(() => {})
  }, [])

  useEffect(() => {
    refreshCount()
    let timer: number | undefined
    const start = () => {
      window.clearInterval(timer)
      timer = window.setInterval(refreshCount, POLL_MS)
    }
    const onVisibility = () => {
      if (document.hidden) {
        window.clearInterval(timer)
      } else {
        refreshCount()
        start()
      }
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    const off = onNotificationsChanged(refreshCount)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      off()
    }
  }, [refreshCount])

  const load = useCallback(() => {
    setList({ kind: 'loading' })
    notificationsApi.list(null, 10).then((p) => setList({ kind: 'ok', items: p.items })).catch(() => setList({ kind: 'error' }))
  }, [])

  useEffect(() => {
    if (!open) return
    load()
    setReadAllFailed(false)
    panelRef.current?.focus()
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      bellRef.current?.focus()
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open, load])

  const markRead = (id: number) => {
    setList((l) => (l.kind === 'ok' ? { kind: 'ok', items: l.items.map((n) => (n.id === id ? { ...n, read: true } : n)) } : l))
    setCount((c) => Math.max(0, c - 1))
    setOpen(false)
  }

  const readAll = async () => {
    setReadAllFailed(false)
    try {
      await notificationsApi.readAll()
      setList((l) => (l.kind === 'ok' ? { kind: 'ok', items: l.items.map((n) => ({ ...n, read: true })) } : l))
      notifyChanged()
    } catch {
      // 배지는 다음 세기에서 맞춰진다
      setReadAllFailed(true)
    }
  }

  const badge = badgeText(count)
  return (
    <div className="menu notification-bell" ref={ref} onBlur={(e) => {
      // 초점이 종·패널 밖의 다른 요소로 옮겨 가면 닫는다
      if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
    }}>
      <button type="button" ref={bellRef} className="btn btn-text bell-button" aria-haspopup="dialog" aria-expanded={open}
              aria-label={badgeLabel(count)} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {badge && <span className="bell-badge" aria-hidden="true">{badge}</span>}
      </button>
      {open && (
        <div className="menu-list notification-panel" role="dialog" aria-label={t('알림')} ref={panelRef} tabIndex={-1}>
          <div className="notification-panel-head">
            <b>{t('알림')}</b>
            <button type="button" className="btn btn-text small" onClick={readAll}
                    disabled={list.kind !== 'ok' || list.items.every((n) => n.read)}>{t('모두 읽음')}</button>
          </div>
          {readAllFailed && <p className="error center small notification-state" role="alert">{t('모두 읽음으로 바꾸지 못했어요. 다시 시도해 주세요.')}</p>}
          {list.kind === 'loading' && <p className="muted center small notification-state">{t('불러오는 중…')}</p>}
          {list.kind === 'error' && (
            <p className="error center small notification-state">
              
              {t('알림을 불러오지 못했어요')} <button type="button" className="btn btn-text small" onClick={load}>{t('다시 시도')}</button>
            </p>
          )}
          {list.kind === 'ok' && (list.items.length === 0
            ? <p className="muted center small notification-state">{t('새 알림이 없어요')}</p>
            : <ul className="notification-list">{list.items.map((n) => <NotificationEntry key={n.id} item={n} onRead={markRead} />)}</ul>)}
          <Link to="/notifications" className="notification-all" onClick={() => setOpen(false)}>{t('모든 알림 보기')}</Link>
        </div>
      )}
    </div>
  )
}
