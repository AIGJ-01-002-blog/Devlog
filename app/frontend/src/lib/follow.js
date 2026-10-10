import { api } from './api';
const member = (handle) => `/api/members/${encodeURIComponent(handle)}`;
export const followApi = {
    set: (handle, on) => api(`${member(handle)}/follow`, { method: on ? 'PUT' : 'DELETE' }),
    list: (handle, direction, cursor) => api(`${member(handle)}/${direction}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
};
export const FEED_ENDPOINT = '/api/feed';
/** 버튼 글자 (FR-008): 팔로우 안 함 [팔로우], 팔로우 중 [팔로잉 ✓], 그 위에 마우스·초점이면 [언팔로우]. */
export function followLabel(following, hover) {
    if (!following)
        return '팔로우';
    return hover ? '언팔로우' : '팔로잉 ✓';
}
export const FOLLOW_ERROR = '잠시 후 다시 시도해 주세요';
/** 비공개로 둔 목록을 다른 사람이 열었을 때 (spec 079) */
export const HIDDEN_FOLLOW_TEXT = '비공개 계정입니다';
export function emptyFollowText(direction) {
    return direction === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로우한 사람이 없어요';
}
/** 목록 이어 붙이기: 사이에 팔로우가 바뀌어 경계가 밀려도 같은 사람을 두 번 보이지 않는다. */
export function appendPeople(prev, next) {
    const seen = new Set(prev.map((p) => p.id));
    return [...prev, ...next.filter((p) => !seen.has(p.id))];
}
