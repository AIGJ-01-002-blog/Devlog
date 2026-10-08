import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { applyTheme, nextTheme, readTheme, THEME_ICON, THEME_LABEL } from '../lib/theme';
/** 헤더 맨 오른쪽 테마 버튼 (021 FR-004): 누를 때마다 시스템 → 라이트 → 다크. */
export function ThemeToggle() {
    const [theme, setTheme] = useState(() => readTheme());
    const next = nextTheme(theme);
    const label = `테마: ${THEME_LABEL[theme]} (누르면 ${THEME_LABEL[next]})`;
    return (_jsx("button", { type: "button", className: "btn btn-text theme-toggle", "aria-label": label, onClick: () => { applyTheme(next); setTheme(next); }, children: _jsx("span", { "aria-hidden": "true", children: THEME_ICON[theme] }) }));
}
