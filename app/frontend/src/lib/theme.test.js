import css from '../styles.css?raw';
import themeScript from '../../public/theme.js?raw';
import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, nextTheme, readTheme, THEME_KEY } from './theme';
describe('theme', () => {
    afterEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });
    it('시스템 → 라이트 → 다크 → 시스템', () => {
        expect(nextTheme('system')).toBe('light');
        expect(nextTheme('light')).toBe('dark');
        expect(nextTheme('dark')).toBe('system');
    });
    it('고정 선택은 저장하고 data-theme로, 시스템은 둘 다 지운다', () => {
        applyTheme('dark');
        expect(localStorage.getItem(THEME_KEY)).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(readTheme()).toBe('dark');
        applyTheme('system');
        expect(localStorage.getItem(THEME_KEY)).toBeNull();
        expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
        expect(readTheme()).toBe('system');
    });
    it('저장소가 막히면 기기 설정을 따르고 오류가 없다', () => {
        const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
        expect(readTheme(blocked)).toBe('system');
        expect(() => applyTheme('light', document.documentElement, blocked)).not.toThrow();
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
    it('이상한 저장 값은 시스템으로 읽는다', () => {
        localStorage.setItem(THEME_KEY, 'sepia');
        expect(readTheme()).toBe('system');
    });
});
describe('styles.css 토큰', () => {
    const block = (re) => (css.match(re)?.[1] ?? '').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('--'));
    it('다크 값은 data-theme와 기기 설정 두 곳에서 같다', () => {
        const fixed = block(/:root\[data-theme="dark"\] \{\n([\s\S]*?)\n\}/);
        const media = block(/:root:not\(\[data-theme="light"\]\) \{\n([\s\S]*?)\n {2}\}/);
        expect(fixed.length).toBeGreaterThan(10);
        expect(media).toEqual(fixed);
    });
    it('공통 색 이름(docs/45 §3)이 라이트·다크 모두에 있다', () => {
        const light = block(/:root, \[data-theme="light"\] \{\n([\s\S]*?)\n\}/).join('\n');
        const dark = block(/:root\[data-theme="dark"\] \{\n([\s\S]*?)\n\}/).join('\n');
        for (const name of ['--color-bg', '--color-surface', '--color-text', '--color-text-muted', '--color-border', '--color-brand',
            '--color-brand-fill', '--color-danger', '--thumb-empty', '--color-code-bg', '--color-focus']) {
            expect(light).toContain(name + ':');
            expect(dark).toContain(name + ':');
        }
        expect(dark).toContain('--color-bg: #121212;');
    });
    it('토큰 밖에서는 색 값을 직접 쓰지 않는다 (FR-013)', () => {
        const outside = css.replace(/:root, \[data-theme="light"\] \{[\s\S]*?\n\}/, '').replace(/:root\[data-theme="dark"\] \{[\s\S]*?\n\}/, '')
            .replace(/@media \(prefers-color-scheme: dark\) \{[\s\S]*?\n\}/, '');
        expect(outside.match(/#[0-9a-fA-F]{3,6}\b|rgba?\(/g)).toBeNull();
    });
});
describe('public/theme.js', () => {
    it('1KB 미만이다 (FR-008)', () => {
        expect(new TextEncoder().encode(themeScript).length).toBeLessThan(1024);
    });
});
