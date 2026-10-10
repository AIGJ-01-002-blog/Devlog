import { api } from './api';
import { t } from './i18n';
export const SEARCH_MAX_LENGTH = 50;
export const NOTICE_TEXT = {
    TWO_CHAR_TITLE_TAG_ONLY: t('두 글자 단어는 제목·태그에서만 찾았어요'),
    TOO_SHORT: t('두 글자 이상 입력해 주세요'),
};
export function searchPath(q, tab = 'posts', sort = 'relevance') {
    const params = new URLSearchParams({ q: q.trim() });
    if (tab !== 'posts')
        params.set('tab', tab);
    if (sort !== 'relevance')
        params.set('sort', sort);
    return `/search?${params.toString().replace(/\+/g, '%20')}`;
}
export function postsEndpoint(q, sort, blog) {
    const params = new URLSearchParams({ q });
    if (sort === 'latest')
        params.set('sort', 'latest');
    if (blog)
        params.set('blog', blog);
    return `/api/search/posts?${params.toString().replace(/\+/g, '%20')}`;
}
export function emptyMessage(q) {
    return t('\'{0}\'에 대한 글이 없어요', { 0: q });
}
/** 검색어에 2글자 단어가 있는지 (안내를 미리 보이려고). 1글자는 무시되므로 세지 않는다. */
export function hasShortWord(q) {
    return q.normalize('NFC').trim().split(/\s+/).some((w) => [...w].length === 2);
}
export function parseSort(raw) {
    return raw === 'latest' ? 'latest' : 'relevance';
}
export const searchApi = {
    people: (q) => api(`/api/search/people?q=${encodeURIComponent(q)}`),
};
