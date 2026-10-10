// 회원 탈퇴·복구 (spec 020). 탈퇴 화면과 복구 화면이 같은 안내(GET /api/me/withdrawal)를 쓴다.
import { api, ApiError } from './api';
import { t } from './i18n';
export const CONFIRM_TEXT = t('탈퇴');
export const withdrawApi = {
    summary: () => api('/api/me/withdrawal'),
    withdraw: (password, confirmText) => api('/api/me/withdrawal', { method: 'POST', body: { confirmed: true, password, confirmText } }),
    restore: () => api('/api/me/restore', { method: 'POST' }),
};
/** [탈퇴하기]는 ① 확인 체크와 ② 본인 확인이 모두 있어야 켜진다 (FR-002). 서버도 같은 것을 다시 본다. */
export function withdrawReady(method, checked, password, confirmText) {
    if (!checked)
        return false;
    return method === 'PASSWORD' ? password.length > 0 : confirmText.trim() === CONFIRM_TEXT;
}
/** 기한까지 남은 날(올림). 기한이 지났으면 0 */
export function daysLeft(restoreBy, now = new Date()) {
    const ms = new Date(restoreBy).getTime() - now.getTime();
    return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
/** 2026년 11월 6일 21:30 */
export function deadline(iso) {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return t('{0}년 {1}월 {2}일 {3}:{4}', { 0: d.getFullYear(), 1: d.getMonth() + 1, 2: d.getDate(), 3: p(d.getHours()), 4: p(d.getMinutes()) });
}
/** 탈퇴 요청 오류를 칸별 문구로: 비밀번호·확인 문구는 그 칸에, 나머지(관리자·잠금 등)는 화면 위에 */
export function withdrawErrorText(err) {
    if (!(err instanceof ApiError))
        return { field: 'form', text: t('잠시 후 다시 시도해 주세요.') };
    const f = err.errors.find((e) => e.field === 'password' || e.field === 'confirmText');
    if (f)
        return { field: f.field, text: f.message };
    return { field: 'form', text: err.errors[0]?.message ?? err.message };
}
/** 탈퇴 신청 상태면 복구 화면과 약관만 쓸 수 있다 (FR-016). */
export function withdrawnRedirect(status, path) {
    const allowed = path === '/account/restore' || path === '/terms' || path === '/privacy';
    if (status === 'WITHDRAWN')
        return allowed ? null : '/account/restore';
    return path === '/account/restore' ? '/' : null;
}
