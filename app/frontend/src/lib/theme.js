import { t } from './i18n';
export const THEME_KEY = 'blog.theme';
const ORDER = ['system', 'light', 'dark'];
export const THEME_LABEL = { system: t('시스템 설정'), light: t('라이트'), dark: t('다크') };
export const THEME_ICON = { system: '🖥', light: '☀️', dark: '🌙' };
/** 시스템 → 라이트 → 다크 → 시스템 (FR-004) */
export function nextTheme(t) {
    return ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
}
export function readTheme(storage = safeStorage()) {
    try {
        const v = storage?.getItem(THEME_KEY);
        return v === 'light' || v === 'dark' ? v : 'system';
    }
    catch {
        return 'system';
    }
}
/** 저장하고 바로 적용한다 (FR-005). "시스템"이면 data-theme를 지워 CSS가 기기 설정을 따르게 한다(FR-006). */
export function applyTheme(t, root = document.documentElement, storage = safeStorage()) {
    try {
        if (t === 'system')
            storage?.removeItem(THEME_KEY);
        else
            storage?.setItem(THEME_KEY, t);
    }
    catch {
        // 저장소가 막혀도 이번 화면에는 적용한다
    }
    // 색이 서서히 바뀌지 않게 한 프레임 동안 전환 효과를 끈다 (FR-012)
    root.classList.add('theme-switching');
    if (t === 'system')
        root.removeAttribute('data-theme');
    else
        root.setAttribute('data-theme', t);
    // 휴대폰 주소창 색(theme-color)도 맞춘다 (068). "시스템"이면 index.html 원래 값(라이트·다크 미디어별)으로 되돌린다
    root.ownerDocument.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
        const light = !m.getAttribute('media')?.includes('dark');
        m.setAttribute('content', t === 'dark' || (t === 'system' && !light) ? '#1b1e25' : '#ffffff');
    });
    void root.offsetWidth;
    requestAnimationFrame(() => root.classList.remove('theme-switching'));
}
function safeStorage() {
    try {
        return window.localStorage;
    }
    catch {
        return null;
    }
}
