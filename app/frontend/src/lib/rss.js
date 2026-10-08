/**
 * RSS 구독 안내 (062). 브라우저로 RSS 주소를 열면 XML 대신 이 안내가 보인다(서버가 Sec-Fetch-Dest로 가른다).
 * 구독 앱 바로가기는 앱이 공개한 "구독 추가" 주소에 피드 주소를 넣은 것이다.
 */
export function rssPath(handle) {
    return handle ? `/@${handle}/rss` : '/rss';
}
export function feedUrl(handle, origin) {
    return origin.replace(/\/$/, '') + rssPath(handle);
}
/** 브라우저에서도 XML 원문을 보는 주소 */
export function rawXmlPath(handle) {
    return `${rssPath(handle)}?format=xml`;
}
export const READERS = [
    { name: 'Feedly', tip: 'Feedly에서 이 블로그 구독하기', url: (f) => `https://feedly.com/i/subscription/feed/${encodeURIComponent(f)}` },
    { name: 'Inoreader', tip: 'Inoreader에서 이 블로그 구독하기', url: (f) => `https://www.inoreader.com/?add_feed=${encodeURIComponent(f)}` },
];
