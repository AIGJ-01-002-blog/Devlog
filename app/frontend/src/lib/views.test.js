import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { sendVisit, VIEW_DWELL_MS, watchView } from './views';
vi.mock('./api', () => ({ api: vi.fn(() => Promise.resolve(undefined)) }));
let callback;
const disconnect = vi.fn();
beforeEach(() => {
    vi.useFakeTimers();
    disconnect.mockClear();
    vi.stubGlobal('IntersectionObserver', class {
        constructor(cb) { callback = cb; }
        observe() { }
        disconnect = disconnect;
    });
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
function visibility(state) {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
}
describe('watchView', () => {
    it('1초 연속으로 보이면 한 번만 보낸다', () => {
        visibility('visible');
        const send = vi.fn();
        watchView(document.body, send);
        callback([{ isIntersecting: true }]);
        vi.advanceTimersByTime(VIEW_DWELL_MS - 1);
        expect(send).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(send).toHaveBeenCalledTimes(1);
        callback([{ isIntersecting: false }]);
        callback([{ isIntersecting: true }]);
        vi.advanceTimersByTime(VIEW_DWELL_MS * 3);
        expect(send).toHaveBeenCalledTimes(1);
        expect(disconnect).toHaveBeenCalled();
    });
    it('탭이 가려지면 처음부터 다시 잰다', () => {
        visibility('visible');
        const send = vi.fn();
        watchView(document.body, send);
        callback([{ isIntersecting: true }]);
        vi.advanceTimersByTime(800);
        visibility('hidden');
        vi.advanceTimersByTime(5000);
        expect(send).not.toHaveBeenCalled();
        visibility('visible');
        vi.advanceTimersByTime(800);
        expect(send).not.toHaveBeenCalled();
        vi.advanceTimersByTime(200);
        expect(send).toHaveBeenCalledTimes(1);
    });
    it('화면 밖이거나 정리되면 보내지 않는다', () => {
        visibility('visible');
        const send = vi.fn();
        const stop = watchView(document.body, send);
        callback([{ isIntersecting: false }]);
        vi.advanceTimersByTime(5000);
        callback([{ isIntersecting: true }]);
        vi.advanceTimersByTime(500);
        stop();
        vi.advanceTimersByTime(5000);
        expect(send).not.toHaveBeenCalled();
    });
});
describe('sendVisit', () => {
    it('사이트 방문은 화면을 처음 열 때 한 번만 보낸다 (spec 064)', () => {
        sendVisit();
        sendVisit();
        expect(api).toHaveBeenCalledTimes(1);
        expect(api).toHaveBeenCalledWith('/api/visits', { method: 'POST', keepalive: true });
    });
});
