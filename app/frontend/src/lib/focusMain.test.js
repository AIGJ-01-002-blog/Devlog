// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { focusMain } from './focusMain';
describe('focusMain', () => {
    it('화면이 바뀌어도 남는 본문 자리로 초점을 옮긴다', () => {
        document.body.innerHTML = '<a href="/x">링크</a><div id="main-content" tabindex="-1"><p>불러오는 중…</p></div>';
        const wrap = document.getElementById('main-content');
        expect(focusMain()).toBe(true);
        expect(document.activeElement).toBe(wrap);
        // 불러오는 중 표시가 실제 화면으로 바뀌어도 초점은 그대로다
        wrap.innerHTML = '<main><h1>제목</h1></main>';
        expect(document.activeElement).toBe(wrap);
    });
    it('본문 자리가 없으면 <main>으로 옮기고 탭 순서에는 넣지 않는다', () => {
        document.body.innerHTML = '<a href="/x">링크</a><main><h1>제목</h1></main>';
        expect(focusMain()).toBe(true);
        const main = document.querySelector('main');
        expect(document.activeElement).toBe(main);
        expect(main.getAttribute('tabindex')).toBe('-1');
    });
    it('화면 이동에서는 스크롤하지 않고, 건너뛰기에서는 본문까지 스크롤한다', () => {
        document.body.innerHTML = '<div id="main-content" tabindex="-1"></div>';
        const wrap = document.getElementById('main-content');
        const scroll = vi.fn();
        wrap.scrollIntoView = scroll;
        focusMain();
        expect(scroll).not.toHaveBeenCalled();
        focusMain(document, { scroll: true });
        expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    });
    it('본문이 없으면 아무것도 하지 않는다', () => {
        document.body.innerHTML = '<p>없음</p>';
        expect(focusMain()).toBe(false);
    });
});
