import { api } from './api';
export const PERIODS = [7, 30, 90];
export const ROLE_LABEL = { USER: '일반 회원', MANAGER: '매니저', ADMIN: '관리자' };
export const MEMBER_STATUS_LABEL = { ACTIVE: '활동 중', SUSPENDED: '정지', WITHDRAWN: '탈퇴 신청' };
export const PROVIDER_LABEL = { GITHUB: 'GitHub', GOOGLE: 'Google', LOCAL: '이메일' };
/** 관리자 페이지를 쓸 수 있는 권한인가 (매니저 포함) */
export function isStaff(role) {
    return role === 'ADMIN' || role === 'MANAGER';
}
export function roleLabel(role) {
    return ROLE_LABEL[role] ?? '일반 회원';
}
export const POST_FILTERS = [
    { code: 'all', label: '전체' },
    { code: 'public', label: '공개' },
    { code: 'private', label: '비공개' },
    { code: 'hidden', label: '숨김' },
];
function query(params) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
        if (v !== null && v !== undefined && v !== '')
            q.set(k, String(v));
    const s = q.toString();
    return s ? `?${s}` : '';
}
export const consoleApi = {
    dashboard: (days) => api(`/api/admin/dashboard${query({ days })}`),
    members: (q, role, status, page) => api(`/api/admin/members${query({ q, role, status, page })}`),
    memberStats: (handle) => api(`/api/admin/members/${encodeURIComponent(handle)}/stats`),
    /** 탈퇴 회원을 30일 유예 전에 바로 정리한다 (020 FR-039). 관리자만, 되돌릴 수 없다 */
    purgeWithdrawn: (handle) => api(`/api/admin/members/${encodeURIComponent(handle)}/purge`, { method: 'POST' }),
    setRole: (handle, role) => api(`/api/admin/members/${encodeURIComponent(handle)}/role`, { method: 'PUT', body: { role } }),
    posts: (q, filter, author, page) => api(`/api/admin/posts${query({ q, filter: filter === 'all' ? null : filter, author, page })}`),
    hidePost: (id, reason) => api(`/api/admin/posts/${id}/hide`, { method: 'POST', body: { reason } }),
    unhidePost: (id) => api(`/api/admin/posts/${id}/unhide`, { method: 'POST' }),
};
/** 이전 기간 대비: "+12%", "-3%", 이전이 0이면 "새로" , 둘 다 0이면 "" */
export function change(current, previous) {
    if (current === previous)
        return { text: current === 0 ? '' : '변화 없음', trend: 'flat' };
    if (previous === 0)
        return { text: '새로 생김', trend: 'up' };
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0)
        return { text: '변화 없음', trend: 'flat' };
    return { text: `${pct > 0 ? '+' : ''}${pct}%`, trend: pct > 0 ? 'up' : 'down' };
}
/** 1,234 처럼 세 자리마다 쉼표 */
export function count(n) {
    return n.toLocaleString('ko-KR');
}
/** 쪽 수 */
export function pageCount(total, pageSize) {
    return Math.max(1, Math.ceil(total / pageSize));
}
