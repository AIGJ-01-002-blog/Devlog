import { api, ApiError } from './api';
import { t } from './i18n';
export const REASONS = [
    { code: 'SPAM', label: t('스팸·광고') },
    { code: 'ABUSE', label: t('욕설·혐오') },
    { code: 'SEXUAL', label: t('음란·선정') },
    { code: 'PRIVACY', label: t('개인정보 노출') },
    { code: 'COPYRIGHT', label: t('저작권 침해') },
    { code: 'OTHER', label: t('기타') },
];
export const DETAIL_MAX = 200;
export function reasonLabel(code) {
    return REASONS.find((r) => r.code === code)?.label ?? t('기타');
}
export const reportApi = {
    report: (targetType, targetId, reason, detail) => api('/api/reports', { method: 'POST', body: { targetType, targetId, reason, detail } }),
};
/** 신고 실패 안내. 성공(같은 대상 재신고 포함)은 같은 문구다. */
export function reportErrorText(e) {
    if (e instanceof ApiError) {
        switch (e.code) {
            case 'CANNOT_REPORT_OWN': return t('자기 글이나 댓글은 신고할 수 없어요.');
            case 'NOT_FOUND': return t('이미 지워졌거나 볼 수 없는 내용이에요.');
            case 'TOO_MANY_REQUESTS': return t('신고가 너무 많아요. 잠시 후 다시 시도해 주세요.');
            case 'EMAIL_NOT_VERIFIED': return t('이메일 인증 후 신고할 수 있어요.');
            case 'VALIDATION_FAILED': return e.errors[0]?.message ?? t('입력을 확인해 주세요.');
        }
    }
    return t('신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
}
export const adminApi = {
    list: (tab, cursor) => api(`/api/admin/reports?tab=${tab}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
    detail: (caseId) => api(`/api/admin/reports/${caseId}`),
    resolve: (caseId, action, reason, suspend) => api(`/api/admin/reports/${caseId}/resolve`, { method: 'POST', body: { action, reason, suspend } }),
    unhide: (caseId) => api(`/api/admin/reports/${caseId}/unhide`, { method: 'POST' }),
    member: (handle) => api(`/api/admin/members/${encodeURIComponent(handle)}`),
    suspend: (handle, days, reason) => api(`/api/admin/members/${encodeURIComponent(handle)}/suspension`, { method: 'POST', body: { days, reason } }),
    lift: (handle) => api(`/api/admin/members/${encodeURIComponent(handle)}/suspension`, { method: 'DELETE' }),
};
export const STATUS_LABEL = {
    PENDING: t('대기'),
    HIDDEN: t('숨김'),
    REJECTED: t('반려'),
    CLOSED_NO_TARGET: t('대상 없음'),
};
export const TARGET_STATE_LABEL = {
    PUBLIC: t('공개'),
    FRIENDS: t('친구 공개'),
    PRIVATE: t('비공개'),
    DRAFT: t('임시'),
    TRASH: t('휴지통'),
    HIDDEN: t('이미 숨김'),
    DELETED_COMMENT: t('삭제됨'),
    AUTHOR_WITHDRAWN: t('작성자 탈퇴'),
    GONE: t('대상 없음'),
};
export const SUSPEND_OPTIONS = [
    { days: 1, label: t('1일') },
    { days: 7, label: t('7일') },
    { days: 30, label: t('30일') },
    { days: null, label: t('영구') },
];
/** "스팸·광고 3 · 기타 1" */
export function reasonSummary(reasons) {
    return REASONS.filter((r) => reasons[r.code]).map((r) => `${r.label} ${reasons[r.code]}`).join(' · ');
}
/** 정지 기한 안내: 영구면 "영구" */
export function suspensionPeriod(s, format) {
    const end = s.endsAt ? t('{0}까지', { 0: format(s.endsAt) }) : t('영구');
    const lifted = s.liftedAt ? t(' · {0} 해제', { 0: format(s.liftedAt) }) : '';
    return `${format(s.startedAt)} ~ ${end}${lifted}`;
}
