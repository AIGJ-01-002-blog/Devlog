import { prepublishChecks, type CheckLevel, type PrepublishInput } from '../lib/prepublish'
import { t, tNodes } from '../lib/i18n'

const ICON: Record<CheckLevel, string> = { ok: '✓', warn: '⚠', info: 'ℹ' }
const LABEL: Record<CheckLevel, string> = { ok: t('통과'), warn: t('확인 필요'), info: t('참고') }

/** 발행 전 점검 (057). 발행을 막지 않는 안내라 색과 함께 기호·숨은 글자로 상태를 알린다. */
export function PrepublishCheck(props: PrepublishInput) {
  const items = prepublishChecks(props)
  const warns = items.filter((i) => i.level === 'warn').length
  return (
    <details className="prepublish" open={warns > 0}>
      <summary data-tip={t('발행하기 전에 놓치기 쉬운 것을 훑어봐요. 발행을 막지는 않아요.')}>
        
        {t('발행 전 점검')} {warns > 0 ? <span className="prepublish-count">{tNodes('확인할 것 {0}개', { 0: warns })}</span> : <span className="muted small">{t('확인할 것 없음')}</span>}
      </summary>
      <ul>
        {items.map((i) => (
          <li key={i.id} className={`prepublish-${i.level}`}>
            <span aria-hidden="true" className="prepublish-icon">{ICON[i.level]}</span>
            <span className="sr-only">{LABEL[i.level]}: </span>{i.text}
          </li>
        ))}
      </ul>
    </details>
  )
}
