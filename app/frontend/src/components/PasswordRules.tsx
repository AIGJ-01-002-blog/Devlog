import { passwordRules } from '../lib/password'
import { t } from '../lib/i18n'

/** 규칙별 충족 여부를 글자와 ✓로 보여 준다 (색만으로 표시하지 않는다, 004 FR-018). */
export function PasswordRules({ password, email, id }: { password: string; email?: string; id?: string }) {
  return (
    <ul className="pw-rules" id={id} aria-live="polite">
      {passwordRules(password, email).map((r) => {
        const ok = password !== '' && r.ok // 비어 있을 때는 아무 규칙도 충족한 것으로 보이지 않게
        return (
          <li key={r.id} className={ok ? 'ok' : password ? 'bad' : ''}>
            <span aria-hidden="true">{ok ? '✓' : '·'}</span> {r.label}
            <span className="sr-only">{ok ? t(' 충족') : t(' 미충족')}</span>
          </li>
        )
      })}
    </ul>
  )
}
