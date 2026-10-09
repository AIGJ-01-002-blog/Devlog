import { useId, useState } from 'react'
import { SUSPEND_OPTIONS, type SuspendDays } from '../lib/moderation'

/** 정지 기간·사유 입력 (019 US4). 사유는 필수, 200자. */
export function SuspendFields({ days, reason, onChange }: {
  days: SuspendDays
  reason: string
  onChange: (days: SuspendDays, reason: string) => void
}) {
  // 한 화면에 정지 입력이 둘 이상 있어도 라디오 묶음이 섞이지 않게 한다
  const group = useId()
  return (
    <div className="suspend-fields">
      <fieldset className="field">
        <legend>정지 기간</legend>
        {SUSPEND_OPTIONS.map((o) => (
          <label key={o.label}>
            <input type="radio" name={group} checked={days === o.days} onChange={() => onChange(o.days, reason)} /> {o.label}
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span>정지 사유 ({[...reason].length}/200)</span>
        <textarea rows={2} maxLength={200} value={reason} onChange={(e) => onChange(days, e.target.value)} placeholder="회원에게 보이는 사유" />
      </label>
    </div>
  )
}

/** 회원 화면의 정지 양식 */
export function SuspendForm({ onSubmit }: { onSubmit: (days: SuspendDays, reason: string) => Promise<void> }) {
  const [days, setDays] = useState<SuspendDays>(7)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form className="suspend-form" onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true)
      try {
        await onSubmit(days, reason.trim())
      } finally {
        setBusy(false)
      }
    }}>
      <SuspendFields days={days} reason={reason} onChange={(d, r) => { setDays(d); setReason(r) }} />
      <button type="submit" className="btn btn-primary" disabled={busy || !reason.trim()}>{busy ? '정지하는 중…' : '정지하기'}</button>
    </form>
  )
}
