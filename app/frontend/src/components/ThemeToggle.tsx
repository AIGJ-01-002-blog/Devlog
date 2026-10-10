import { useState } from 'react'
import { applyTheme, nextTheme, readTheme, THEME_ICON, THEME_LABEL, type ThemeChoice } from '../lib/theme'
import { t } from '../lib/i18n'

/** 헤더 맨 오른쪽 테마 버튼 (021 FR-004): 누를 때마다 시스템 → 라이트 → 다크. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>(() => readTheme())
  const next = nextTheme(theme)
  const label = t('테마: {0} (누르면 {1})', { 0: THEME_LABEL[theme], 1: THEME_LABEL[next] })
  return (
    <button type="button" className="btn btn-text theme-toggle" aria-label={label}
            onClick={() => { applyTheme(next); setTheme(next) }}>
      <span aria-hidden="true">{THEME_ICON[theme]}</span>
    </button>
  )
}
