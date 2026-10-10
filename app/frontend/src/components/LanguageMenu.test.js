import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageMenu } from './LanguageMenu';
describe('머리말 언어 메뉴 (081)', () => {
    afterEach(cleanup);
    it('🌐을 누르면 네 언어가 보이고 지금 언어에 표시가 있다', () => {
        render(_jsx(LanguageMenu, {}));
        const button = screen.getByRole('button', { name: '언어: 한국어' });
        expect(button.getAttribute('data-tip')).toBe('화면 언어 바꾸기');
        fireEvent.click(button);
        const items = screen.getAllByRole('menuitemradio');
        expect(items.map((i) => i.textContent?.replace('✓', ''))).toEqual(['한국어', 'English', '日本語', '中文']);
        expect(items[0].getAttribute('aria-checked')).toBe('true');
        expect(document.activeElement).toBe(items[0]);
    });
    it('Escape로 닫고 버튼으로 초점을 돌린다', () => {
        render(_jsx(LanguageMenu, {}));
        const button = screen.getByRole('button', { name: '언어: 한국어' });
        fireEvent.click(button);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();
        expect(document.activeElement).toBe(button);
    });
});
