// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { focusMain } from './focusMain';
describe('focusMain', () => {
    it('본문으로 초점을 옮기고 탭 순서에는 넣지 않는다', () => {
        document.body.innerHTML = '<a href="/x">링크</a><main><h1>제목</h1></main>';
        expect(focusMain()).toBe(true);
        const main = document.querySelector('main');
        expect(document.activeElement).toBe(main);
        expect(main.getAttribute('tabindex')).toBe('-1');
    });
    it('본문이 없으면 아무것도 하지 않는다', () => {
        document.body.innerHTML = '<p>없음</p>';
        expect(focusMain()).toBe(false);
    });
});
