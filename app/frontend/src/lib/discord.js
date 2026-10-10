import { api } from './api';
const WEBHOOK_URL = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api(?:\/v\d{1,2})?\/webhooks\/\d{15,25}\/[A-Za-z0-9_-]{20,128}\/?$/;
/** 서버와 같은 꼴인지 미리 본다. 틀리면 보내기 전에 알려 준다 */
export function isDiscordWebhookUrl(url) {
    return WEBHOOK_URL.test(url.trim());
}
export const discordApi = {
    status: () => api('/api/me/discord'),
    connect: (url) => api('/api/me/discord', { method: 'PUT', body: { url: url.trim() } }),
    test: () => api('/api/me/discord/test', { method: 'POST' }),
    setNotifications: (notifications) => api('/api/me/discord', { method: 'PATCH', body: { notifications } }),
    unlink: () => api('/api/me/discord', { method: 'DELETE' }),
};
