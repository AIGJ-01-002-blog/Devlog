import { useEffect, useRef, type ReactNode } from 'react'
import { trapFocus } from '../lib/modalFocus'

/**
 * 모달 대화상자 한 벌: 바깥 막, aria-modal, 초점 가두기·Esc 닫기·연 버튼으로 초점 돌려주기를 한곳에서 맡는다.
 * onClose가 렌더마다 바뀌어도 초점 규칙은 열릴 때 한 번만 건다.
 */
export function Modal({ labelledBy, onClose, wide = false, closeOnBackdrop = false, children }: {
  labelledBy: string
  onClose: () => void
  wide?: boolean
  closeOnBackdrop?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => (ref.current ? trapFocus(ref.current, () => close.current()) : undefined), [])

  return (
    <div className="dialog-backdrop" role="presentation"
         onClick={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose() } : undefined}>
      <div ref={ref} className={wide ? 'dialog dialog-wide' : 'dialog'} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  )
}
