import { api } from './api';
import { t } from './i18n';
/** 연결 주소를 연 뒤 이 간격으로 상태를 다시 읽는다. 주소가 끝나면 멈춘다. */
export const LINK_POLL_MS = 3_000;
/** 연결 주소의 남은 시간 문구. 끝났으면 null */
export function linkTimeLeft(expiresAt, now = Date.now()) {
    const ms = new Date(expiresAt).getTime() - now;
    if (!(ms > 0))
        return null;
    const min = Math.ceil(ms / 60_000);
    return min > 1 ? t('{0}분 안에 열어 주세요.', { 0: min }) : t('1분 안에 열어 주세요.');
}
export const telegramApi = {
    status: () => api('/api/me/telegram'),
    link: () => api('/api/me/telegram/link', { method: 'POST' }),
    setNotifications: (notifications) => api('/api/me/telegram', { method: 'PATCH', body: { notifications } }),
    unlink: () => api('/api/me/telegram', { method: 'DELETE' }),
};
