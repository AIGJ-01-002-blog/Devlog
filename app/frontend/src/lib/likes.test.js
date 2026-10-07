import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compactNumber } from './format';
import { createLikeSync } from './likes';
describe('createLikeSync', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });
    function setup(initial, send) {
        const seen = [];
        const errors = [];
        const sync = createLikeSync({ initial, send, onChange: (s) => seen.push(s), onError: () => errors.push(1) });
        return { sync, seen, errors };
    }
    it('누르면 바로 바뀌고 서버 숫자로 맞춘다', async () => {
        const send = vi.fn(async (liked) => ({ liked, likeCount: 20 }));
        const { sync, seen } = setup({ liked: false, likeCount: 12 }, send);
        sync.toggle();
        expect(seen.at(-1)).toEqual({ liked: true, likeCount: 13 });
        expect(send).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(300);
        expect(send).toHaveBeenCalledExactlyOnceWith(true);
        expect(sync.state).toEqual({ liked: true, likeCount: 20 });
    });
    it('연타하면 마지막 상태만 한 번 보낸다', async () => {
        const send = vi.fn(async (liked) => ({ liked, likeCount: liked ? 13 : 12 }));
        const { sync } = setup({ liked: false, likeCount: 12 }, send);
        sync.toggle();
        sync.toggle();
        sync.toggle();
        await vi.advanceTimersByTimeAsync(300);
        expect(send).toHaveBeenCalledExactlyOnceWith(true);
    });
    it('눌렀다 바로 취소하면 아무것도 보내지 않는다', async () => {
        const send = vi.fn(async (liked) => ({ liked, likeCount: 0 }));
        const { sync } = setup({ liked: false, likeCount: 12 }, send);
        sync.toggle();
        sync.toggle();
        await vi.advanceTimersByTimeAsync(300);
        expect(send).not.toHaveBeenCalled();
        expect(sync.state).toEqual({ liked: false, likeCount: 12 });
    });
    it('실패하면 되돌리고 알린다', async () => {
        const { sync, errors } = setup({ liked: true, likeCount: 5 }, async () => { throw new Error('x'); });
        sync.toggle();
        expect(sync.state).toEqual({ liked: false, likeCount: 4 });
        await vi.advanceTimersByTimeAsync(300);
        expect(sync.state).toEqual({ liked: true, likeCount: 5 });
        expect(errors).toHaveLength(1);
    });
    it('보내는 중에 다시 누르면 늦게 온 응답이 화면을 덮지 않는다', async () => {
        let resolve;
        const send = vi.fn((liked) => liked
            ? new Promise((r) => { resolve = r; })
            : Promise.resolve({ liked: false, likeCount: 12 }));
        const { sync } = setup({ liked: false, likeCount: 12 }, send);
        sync.toggle();
        await vi.advanceTimersByTimeAsync(300);
        sync.toggle();
        resolve({ liked: true, likeCount: 13 });
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.state.liked).toBe(false);
        await vi.advanceTimersByTimeAsync(300);
        expect(send).toHaveBeenLastCalledWith(false);
        expect(sync.state).toEqual({ liked: false, likeCount: 12 });
    });
    it('보내는 중에 눌렀다 되돌려도 마지막 상태가 남는다', async () => {
        let resolve;
        const send = vi.fn((liked) => liked
            ? new Promise((r) => { resolve = r; })
            : Promise.resolve({ liked: false, likeCount: 12 }));
        const { sync } = setup({ liked: false, likeCount: 12 }, send);
        sync.toggle();
        await vi.advanceTimersByTimeAsync(300); // true 전송 중
        sync.toggle();
        sync.toggle();
        sync.toggle(); // 최종 false
        await vi.advanceTimersByTimeAsync(300);
        resolve({ liked: true, likeCount: 13 });
        await vi.advanceTimersByTimeAsync(0);
        expect(send).toHaveBeenLastCalledWith(false);
        expect(sync.state).toEqual({ liked: false, likeCount: 12 });
    });
});
describe('compactNumber', () => {
    it('9,999까지 쉼표, 1만 이상은 소수 첫째 자리 내림', () => {
        expect(compactNumber(0)).toBe('0');
        expect(compactNumber(1234)).toBe('1,234');
        expect(compactNumber(9999)).toBe('9,999');
        expect(compactNumber(10_000)).toBe('1만');
        expect(compactNumber(12_950)).toBe('1.2만');
        expect(compactNumber(129_999)).toBe('12.9만');
    });
});
