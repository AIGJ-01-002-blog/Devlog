import { describe, expect, it, vi } from 'vitest';
import { absoluteUrl, shareLink } from './share';
const URL_ = 'https://devlog.life/@minseo/42';
function env(over) {
    return { touch: false, ...over };
}
describe('shareLink', () => {
    it('데스크톱은 공유 창이 있어도 링크를 복사한다', async () => {
        const share = vi.fn(async () => { });
        const writeText = vi.fn(async () => { });
        expect(await shareLink(URL_, '제목', env({ share, writeText }))).toBe('copied');
        expect(share).not.toHaveBeenCalled();
        expect(writeText).toHaveBeenCalledWith(URL_);
    });
    it('터치 기기는 기기 공유 창을 연다', async () => {
        const share = vi.fn(async () => { });
        expect(await shareLink(URL_, '제목', env({ touch: true, share }))).toBe('shared');
        expect(share).toHaveBeenCalledWith({ title: '제목', url: URL_ });
    });
    it('공유 창을 닫으면 복사하지 않는다', async () => {
        const writeText = vi.fn(async () => { });
        const share = vi.fn(async () => { throw new DOMException('closed', 'AbortError'); });
        expect(await shareLink(URL_, '제목', env({ touch: true, share, writeText }))).toBe('cancelled');
        expect(writeText).not.toHaveBeenCalled();
    });
    it('공유 창이 실패하면 복사로 넘어간다', async () => {
        const writeText = vi.fn(async () => { });
        const share = vi.fn(async () => { throw new DOMException('denied', 'NotAllowedError'); });
        expect(await shareLink(URL_, '제목', env({ touch: true, share, writeText }))).toBe('copied');
    });
    it('복사할 수 없으면 실패로 알린다', async () => {
        expect(await shareLink(URL_, '제목', env({}))).toBe('failed');
        const writeText = vi.fn(async () => { throw new Error('denied'); });
        expect(await shareLink(URL_, '제목', env({ writeText }))).toBe('failed');
    });
});
describe('absoluteUrl', () => {
    it('사이트 안 경로를 전체 주소로 만든다', () => {
        expect(absoluteUrl('/@minseo/42', 'https://devlog.life')).toBe(URL_);
        expect(absoluteUrl('/@민서/42', 'https://devlog.life')).toBe('https://devlog.life/@%EB%AF%BC%EC%84%9C/42');
    });
});
