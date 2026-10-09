import { jsx as _jsx } from "react/jsx-runtime";
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InfiniteLoader } from './InfiniteLoader';
let observers = [];
beforeEach(() => {
    observers = [];
    vi.stubGlobal('IntersectionObserver', class {
        entry;
        constructor(cb) {
            this.entry = { cb, disconnected: false };
            observers.push(this.entry);
        }
        observe() { }
        disconnect() { this.entry.disconnected = true; }
    });
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});
const live = () => observers.filter((o) => !o.disconnected);
describe('InfiniteLoader', () => {
    it('끝이 화면 가까이 오면 다음 쪽을 한 번 부른다', () => {
        const onMore = vi.fn();
        render(_jsx(InfiniteLoader, { hasMore: true, loading: false, failed: false, onMore: onMore }));
        act(() => live()[0].cb([{ isIntersecting: false }]));
        expect(onMore).not.toHaveBeenCalled();
        act(() => live()[0].cb([{ isIntersecting: true }]));
        expect(onMore).toHaveBeenCalledTimes(1);
        // 부른 뒤에는 감시를 멈춰 같은 쪽을 두 번 부르지 않는다
        expect(live()).toHaveLength(0);
        expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull();
    });
    it('불러오는 동안은 감시하지 않고, 다 받은 뒤 감시를 새로 건다', () => {
        const onMore = vi.fn();
        const { rerender } = render(_jsx(InfiniteLoader, { hasMore: true, loading: true, failed: false, onMore: onMore }));
        expect(live()).toHaveLength(0);
        expect(screen.getByRole('status').textContent).toBe('불러오는 중…');
        rerender(_jsx(InfiniteLoader, { hasMore: true, loading: false, failed: false, onMore: onMore }));
        expect(live()).toHaveLength(1);
    });
    it('실패하면 저절로 부르지 않고 [다시 시도]를 보인다', () => {
        const onMore = vi.fn();
        render(_jsx(InfiniteLoader, { hasMore: true, loading: false, failed: true, onMore: onMore, failedText: "\uAE00\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694" }));
        expect(live()).toHaveLength(0);
        expect(screen.getByRole('alert').textContent).toContain('글을 불러오지 못했어요');
        fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
        expect(onMore).toHaveBeenCalledTimes(1);
    });
    it('더 받을 게 없으면 아무것도 그리지 않는다', () => {
        const { container } = render(_jsx(InfiniteLoader, { hasMore: false, loading: false, failed: false, onMore: () => { } }));
        expect(container.innerHTML).toBe('');
        expect(observers).toHaveLength(0);
    });
    it('IntersectionObserver가 없으면 [더 보기] 버튼으로 부른다', () => {
        vi.stubGlobal('IntersectionObserver', undefined);
        const onMore = vi.fn();
        render(_jsx(InfiniteLoader, { hasMore: true, loading: false, failed: false, onMore: onMore }));
        const button = screen.getByRole('button', { name: '더 보기' });
        expect(button.getAttribute('title')).toBeTruthy();
        fireEvent.click(button);
        expect(onMore).toHaveBeenCalledTimes(1);
    });
});
