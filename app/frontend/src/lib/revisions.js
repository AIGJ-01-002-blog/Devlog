import { api } from './api';
import { t } from './i18n';
export const revisions = {
    list: (postId) => api(`/api/posts/${postId}/revisions`),
    get: (postId, no) => api(`/api/posts/${postId}/revisions/${no}`),
};
/** 목록 한 줄 이름: 맨 위(가장 최근)는 "지금 발행본", 맨 처음 판은 "첫 발행". */
export function revisionLabel(item, latestNo) {
    if (item.no === latestNo)
        return t('{0}판 · 지금 발행본', { 0: item.no });
    if (item.no === 1)
        return t('1판 · 첫 발행');
    return t('{0}판', { 0: item.no });
}
