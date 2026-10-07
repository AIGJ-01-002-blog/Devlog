// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchPageName } from './announcePage';
const flush = () => new Promise((r) => setTimeout(r, 0));
describe('watchPageName', () => {
    afterEach(() => vi.useRealTimers());
    it('불러오는 중 표시가 실제 화면으로 바뀌면 새 제목을 한 번 알린다', async () => {
        document.body.innerHTML = '<div id="main-content"><main><h1>이전 화면</h1></main></div>';
        const root = document.getElementById('main-content');
        const announce = vi.fn();
        watchPageName(root, announce);
        root.innerHTML = '<main><p>불러오는 중…</p></main>';
        await flush();
        expect(announce).not.toHaveBeenCalled();
        root.innerHTML = '<main><h1> 새 글 제목 </h1></main>';
        await flush();
        root.innerHTML = '<main><h1>또 바뀜</h1></main>';
        await flush();
        expect(announce).toHaveBeenCalledTimes(1);
        expect(announce).toHaveBeenCalledWith('새 글 제목');
    });
    it('제목이 끝내 없으면 문서 제목을 알린다', () => {
        vi.useFakeTimers();
        document.title = '설정 - devlog';
        document.body.innerHTML = '<div id="main-content"></div>';
        const announce = vi.fn();
        watchPageName(document.getElementById('main-content'), announce, 1000);
        vi.advanceTimersByTime(1000);
        expect(announce).toHaveBeenCalledWith('설정 - devlog');
    });
    it('다음 이동이 먼저 오면 그만 지켜본다', async () => {
        vi.useFakeTimers();
        document.body.innerHTML = '<div id="main-content"></div>';
        const root = document.getElementById('main-content');
        const announce = vi.fn();
        const stop = watchPageName(root, announce, 1000);
        stop();
        root.innerHTML = '<h1>늦게 온 제목</h1>';
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
        expect(announce).not.toHaveBeenCalled();
    });
});
