import { api } from './api';
export const revisions = {
    list: (postId) => api(`/api/posts/${postId}/revisions`),
    get: (postId, no) => api(`/api/posts/${postId}/revisions/${no}`),
};
/** 목록 한 줄 이름: 맨 위(가장 최근)는 "지금 발행본", 맨 처음 판은 "첫 발행". */
export function revisionLabel(item, latestNo) {
    if (item.no === latestNo)
        return `${item.no}판 · 지금 발행본`;
    if (item.no === 1)
        return '1판 · 첫 발행';
    return `${item.no}판`;
}
