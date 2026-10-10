import { api } from './api';
import { t } from './i18n';
// 친구 맺기와 최근 활동 (008). 상대는 블로그 주소로만 고른다.
const path = (handle) => `/api/me/friends/${encodeURIComponent(handle)}`;
export const friendsApi = {
    overview: () => api('/api/me/friends'),
    request: (handle) => api(path(handle), { method: 'PUT' }).then((r) => r.relation),
    accept: (handle) => api(`${path(handle)}/accept`, { method: 'POST' }).then((r) => r.relation),
    /** 거절·요청 취소·친구 끊기. 상대에게 알리지 않는다. */
    remove: (handle) => api(path(handle), { method: 'DELETE' }),
};
/** 최근 활동 구간 표시. 정확한 시각은 서버도 보내지 않는다. */
export function lastActiveLabel(days) {
    if (days == null)
        return null;
    if (days <= 0)
        return t('오늘');
    if (days === 1)
        return t('어제');
    if (days < 7)
        return t('{0}일 전', { 0: days });
    return t('1주 이상');
}
