import { api } from './api';
import { reasonLabel } from './moderation';
import { t } from './i18n';
/** 알림 설정에 보이는 순서와 이름 (FR-035). 아직 기능이 없는 종류(팔로우·새 글)도 미리 끌 수 있다. */
export const MUTABLE_TYPES = [
    { type: 'COMMENT', label: t('내 글에 달린 댓글') },
    { type: 'REPLY', label: t('내 댓글에 달린 답글') },
    { type: 'LIKE', label: t('좋아요') },
    { type: 'FOLLOW', label: t('새 팔로워') },
    { type: 'NEW_POST', label: t('팔로우한 사람의 새 글') },
    { type: 'FRIEND_REQUEST', label: t('받은 친구 요청') },
    { type: 'FRIEND_ACCEPTED', label: t('친구 요청 수락') },
    { type: 'AI_PROPOSAL', label: t('AI의 글 제안') },
];
export const POLL_MS = 30_000;
export const notificationsApi = {
    list: (cursor, size = 20) => api(`/api/me/notifications?size=${size}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
    unreadCount: () => api('/api/me/notifications/unread-count').then((r) => r.count),
    read: (id) => api(`/api/me/notifications/${id}/read`, { method: 'POST' }),
    readAll: () => api('/api/me/notifications/read-all', { method: 'POST' }),
    remove: (id) => api(`/api/me/notifications/${id}`, { method: 'DELETE' }),
    settings: () => api('/api/me/notification-settings'),
    saveSettings: (muted) => api('/api/me/notification-settings', { method: 'PUT', body: { muted } }),
};
/** 배지 숫자: 99개 넘으면 99+ (FR-025). 0이면 배지를 숨긴다. */
export function badgeText(count) {
    if (count <= 0)
        return null;
    return count > 99 ? '99+' : String(count);
}
export function badgeLabel(count) {
    return count > 0 ? t('안 읽은 알림 {0}개', { 0: count }) : t('알림');
}
export function messageOf(n) {
    const who = n.actor == null ? null : n.actor.withdrawn ? t('탈퇴한 사용자') : n.actor.nickname;
    const others = n.othersCount > 0 ? t(' 외 {0}명', { 0: n.othersCount }) : '';
    if (n.type === 'REPORT_RESOLVED') {
        return n.result === 'ACTION_TAKEN'
            ? { who: null, text: t('신고하신 내용을 검토해 조치했어요. 알려 주셔서 고마워요'), quote: null }
            : { who: null, text: t('신고하신 내용을 검토했지만 운영 정책 위반은 아니었어요'), quote: null };
    }
    if (n.type === 'CONTENT_HIDDEN')
        return hiddenMessage(n);
    if (n.type === 'INQUIRY_ANSWERED') {
        return { who: null, text: t('남기신 문의{0}에 답변이 왔어요', { 0: n.inquiry ? `「${n.inquiry.title}」` : '' }), quote: null };
    }
    if (n.type === 'AI_PROPOSAL') {
        return { who: null, text: t('AI가 글을 제안했어요{0}', { 0: n.proposal ? `「${n.proposal.title}」` : '' }), quote: null };
    }
    const unreadable = n.post != null && !n.post.readable;
    const title = n.post?.title ? `「${n.post.title}」` : '';
    if (unreadable) {
        return { who: null, text: t('볼 수 없는 글이에요'), quote: null };
    }
    switch (n.type) {
        case 'COMMENT':
            return { who: t('{0}님', { 0: who }), text: t('이 {0}에 댓글을 남겼어요', { 0: title }), quote: n.commentPreview };
        case 'REPLY':
            return { who: t('{0}님', { 0: who }), text: t('이 회원님의 댓글에 답글을 남겼어요'), quote: n.commentPreview };
        case 'LIKE':
            return { who: t('{0}님{1}', { 0: who, 1: others }), text: t('이 {0}을(를) 좋아해요', { 0: title }), quote: null };
        case 'FOLLOW':
            return { who: t('{0}님{1}', { 0: who, 1: others }), text: t('이 회원님을 팔로우해요'), quote: null };
        case 'FRIEND_REQUEST':
            return { who: t('{0}님', { 0: who }), text: t('이 친구 요청을 보냈어요'), quote: null };
        case 'FRIEND_ACCEPTED':
            return { who: t('{0}님', { 0: who }), text: t('이 친구 요청을 수락했어요'), quote: null };
        case 'NEW_POST':
            return { who: t('{0}님', { 0: who }), text: t('이 새 글 {0}을(를) 올렸어요', { 0: title }), quote: null };
        default:
            return { who: null, text: '', quote: null };
    }
}
/** 숨김 알림 (docs/25 §2): 사유는 지금 대상에서 읽는다. 그 사이 풀렸으면 "숨겨졌었어요 (지금은 다시 보여요)". */
function hiddenMessage(n) {
    // 언어마다 어순이 달라 '댓글/글' 조각을 끼우지 않고 문장을 통째로 고른다
    const comment = n.hidden?.targetType === 'COMMENT';
    const title = n.post?.title ? `「${n.post.title}」` : '';
    if (!n.hidden?.stillHidden) {
        const text = comment
            ? t('회원님의 댓글이 운영 정책에 따라 숨겨졌었어요 (지금은 다시 보여요)')
            : title
                ? t('회원님의 글{0}이(가) 운영 정책에 따라 숨겨졌었어요 (지금은 다시 보여요)', { 0: title })
                : t('회원님의 글이 운영 정책에 따라 숨겨졌었어요 (지금은 다시 보여요)');
        return { who: null, text, quote: null };
    }
    const reason = reasonLabel(n.hidden.reason);
    const text = comment
        ? t('회원님의 댓글이 운영 정책에 따라 숨겨졌어요 (사유: {0})', { 0: reason })
        : title
            ? t('회원님의 글{0}이(가) 운영 정책에 따라 숨겨졌어요 (사유: {1})', { 0: title, 1: reason })
            : t('회원님의 글이 운영 정책에 따라 숨겨졌어요 (사유: {0})', { 0: reason });
    return { who: null, text, quote: null };
}
/** 시각: 1시간 안 N분 전, 24시간 안 N시간 전, 그 뒤 2026.10.02 (FR-024). */
export { relativeDate as notificationTime } from './format';
/** 알림 페이지에서 읽음·삭제하면 헤더 배지가 바로 다시 센다(다음 30초를 기다리지 않게). */
const CHANGED = 'notifications:changed';
export function notifyChanged() {
    window.dispatchEvent(new Event(CHANGED));
}
export function onNotificationsChanged(fn) {
    window.addEventListener(CHANGED, fn);
    return () => window.removeEventListener(CHANGED, fn);
}
