import { api } from './api';
import { t } from './i18n';
export const SERIES_NAME_MAX = 50;
const member = (handle) => `/api/members/${encodeURIComponent(handle)}`;
export const seriesApi = {
    list: (handle) => api(`${member(handle)}/series`),
    detail: (handle, slug) => api(`${member(handle)}/series/${encodeURIComponent(slug)}`),
    /** 시리즈에 없으면 204라 null */
    ofPost: (postId) => api(`/api/posts/${postId}/series`).then((n) => n ?? null),
    assign: (postId, seriesId) => api(`/api/posts/${postId}/series`, { method: 'PUT', body: { seriesId } }),
    mine: () => api('/api/me/series'),
    create: (name) => api('/api/me/series', { method: 'POST', body: { name } }),
    rename: (id, name) => api(`/api/me/series/${id}`, { method: 'PATCH', body: { name } }),
    remove: (id) => api(`/api/me/series/${id}`, { method: 'DELETE' }),
    reorder: (id, postIds) => api(`/api/me/series/${id}/posts`, { method: 'PUT', body: { postIds } }),
    /** 새 글 알림 받기·그만 받기 (072) */
    subscribe: (id, on) => api(`/api/series/${id}/subscription`, { method: on ? 'PUT' : 'DELETE' }),
};
export const seriesPath = (handle, slug) => `/@${handle}/series/${encodeURIComponent(slug)}`;
/** 서버와 같은 규칙의 이름 검사 (FR-001): 앞뒤 공백을 빼고 1~50자, 글자나 숫자가 하나는 있어야 주소를 만든다. */
export function seriesNameError(raw) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name)
        return t('시리즈 이름을 써 주세요.');
    if ([...name].length > SERIES_NAME_MAX)
        return t('{0}자 안으로 써 주세요.', { 0: SERIES_NAME_MAX });
    if (!/[\p{L}\p{N}]/u.test(name))
        return t('글자나 숫자를 넣어 주세요.');
    return null;
}
/** 이전·다음 글. 지금 글이 목록에 없으면 둘 다 없다. */
export function neighbors(nav) {
    if (nav.index == null)
        return { prev: null, next: null };
    return { prev: nav.posts[nav.index - 2] ?? null, next: nav.posts[nav.index] ?? null };
}
