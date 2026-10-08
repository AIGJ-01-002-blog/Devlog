import { describe, expect, it } from 'vitest';
import { feedUrl, rawXmlPath, READERS, rssPath } from './rss';
describe('RSS 구독 안내 (063)', () => {
    it('블로그와 전체 피드 주소를 만든다', () => {
        expect(rssPath('minseo')).toBe('/@minseo/rss');
        expect(rssPath(null)).toBe('/rss');
        expect(feedUrl('minseo', 'https://devlog.life/')).toBe('https://devlog.life/@minseo/rss');
        expect(rawXmlPath(null)).toBe('/rss?format=xml');
    });
    it('구독 앱 바로가기에는 피드 주소를 인코딩해 넣는다', () => {
        const f = 'https://devlog.life/@minseo/rss';
        expect(READERS.map((r) => r.url(f))).toEqual([
            'https://feedly.com/i/subscription/feed/https%3A%2F%2Fdevlog.life%2F%40minseo%2Frss',
            'https://www.inoreader.com/?add_feed=https%3A%2F%2Fdevlog.life%2F%40minseo%2Frss',
        ]);
    });
});
