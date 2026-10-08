import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TIP_DELAY_MS } from '../lib/tooltip';
import { TooltipLayer } from './TooltipLayer';
const over = (el, pointerType = 'mouse') => {
    const e = new MouseEvent('pointerover', { bubbles: true });
    Object.defineProperty(e, 'pointerType', { value: pointerType });
    el.dispatchEvent(e);
};
let root = null;
const tip = () => document.getElementById('app-tooltip');
function setup(markup) {
    ;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    const page = document.createElement('div');
    page.innerHTML = markup;
    document.body.appendChild(page);
    const host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(_jsx(TooltipLayer, {})));
    return page;
}
describe('TooltipLayer', () => {
    afterEach(() => {
        act(() => root?.unmount());
        root = null;
        document.body.innerHTML = '';
        vi.useRealTimers();
    });
    it('마우스를 올리면 잠깐 뒤 이름을 보여 주고, Esc로 닫는다', () => {
        const page = setup('<button aria-label="알림"><svg aria-hidden="true"></svg></button>');
        act(() => over(page.querySelector('svg')));
        expect(tip()).toBeNull();
        act(() => { vi.advanceTimersByTime(TIP_DELAY_MS); });
        expect(tip()?.textContent).toBe('알림');
        expect(tip()?.getAttribute('role')).toBe('tooltip');
        act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
        expect(tip()).toBeNull();
    });
    it('손가락 터치에서는 띄우지 않는다', () => {
        const page = setup('<button aria-label="알림">🔔</button>');
        act(() => { over(page.querySelector('button'), 'touch'); vi.advanceTimersByTime(1000); });
        expect(tip()).toBeNull();
    });
    it('키보드 초점이 오면 바로 띄우고, 설명은 aria-describedby로 잇는다', () => {
        const page = setup('<a href="/feed" data-tip="팔로우한 사람의 새 글">피드</a>');
        const a = page.querySelector('a');
        // jsdom은 키보드 초점(:focus-visible)을 가리지 않아, 키보드로 온 것으로 둔다
        const matches = a.matches.bind(a);
        a.matches = (sel) => sel === ':focus-visible' || matches(sel);
        act(() => { a.focus(); });
        expect(tip()?.textContent).toBe('팔로우한 사람의 새 글');
        expect(a.getAttribute('aria-describedby')).toBe('app-tooltip');
        act(() => { a.blur(); });
        expect(tip()).toBeNull();
        expect(a.hasAttribute('aria-describedby')).toBe(false);
    });
    it('브라우저 기본 말풍선이 겹치지 않게 title을 잠깐 옮겼다가 되돌린다', () => {
        const page = setup('<span title="조회수는 하루 한 번만 셉니다" tabindex="0">조회 3</span>');
        const span = page.querySelector('span');
        act(() => { over(span); vi.advanceTimersByTime(TIP_DELAY_MS); });
        expect(tip()?.textContent).toBe('조회수는 하루 한 번만 셉니다');
        expect(span.hasAttribute('title')).toBe(false);
        act(() => { document.dispatchEvent(new Event('pointerdown')); });
        expect(span.getAttribute('title')).toBe('조회수는 하루 한 번만 셉니다');
    });
    it('보이는 글자와 같은 이름은 띄우지 않는다', () => {
        const page = setup('<button>로그인</button>');
        act(() => { over(page.querySelector('button')); vi.advanceTimersByTime(1000); });
        expect(tip()).toBeNull();
    });
});
