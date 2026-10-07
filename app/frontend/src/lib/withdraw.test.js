import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { daysLeft, deadline, withdrawErrorText, withdrawnRedirect, withdrawReady } from './withdraw';
describe('withdrawReady', () => {
    it('확인 체크와 본인 확인이 모두 있어야 켜진다', () => {
        expect(withdrawReady('CONFIRM_TEXT', false, '', '탈퇴')).toBe(false);
        expect(withdrawReady('CONFIRM_TEXT', true, '', '탈퇴할래요')).toBe(false);
        expect(withdrawReady('CONFIRM_TEXT', true, '', ' 탈퇴 ')).toBe(true);
        expect(withdrawReady('PASSWORD', true, '', '탈퇴')).toBe(false);
        expect(withdrawReady('PASSWORD', true, 'pw', '')).toBe(true);
    });
});
describe('daysLeft·deadline', () => {
    const now = new Date('2026-10-07T12:00:00Z');
    it('남은 날은 올림이고 지났으면 0이다', () => {
        expect(daysLeft('2026-11-06T12:00:00Z', now)).toBe(30);
        expect(daysLeft('2026-10-07T12:00:01Z', now)).toBe(1);
        expect(daysLeft('2026-10-07T11:00:00Z', now)).toBe(0);
    });
    it('기한은 날짜와 시각까지 보인다', () => {
        expect(deadline('2026-11-06T12:05:00')).toBe('2026년 11월 6일 12:05');
    });
});
describe('withdrawErrorText', () => {
    it('비밀번호·확인 문구 오류는 그 칸에, 나머지는 화면 위에', () => {
        const pw = new ApiError(400, 'VALIDATION_FAILED', '입력값', [{ field: 'password', code: 'PASSWORD_WRONG', message: '비밀번호가 올바르지 않아요.' }]);
        expect(withdrawErrorText(pw)).toEqual({ field: 'password', text: '비밀번호가 올바르지 않아요.' });
        const admin = new ApiError(409, 'ADMIN_CANNOT_WITHDRAW', '관리자 권한을 해제한 뒤 탈퇴할 수 있어요.');
        expect(withdrawErrorText(admin)).toEqual({ field: 'form', text: '관리자 권한을 해제한 뒤 탈퇴할 수 있어요.' });
        expect(withdrawErrorText(new Error('x')).field).toBe('form');
    });
});
describe('withdrawnRedirect', () => {
    it('탈퇴 신청 회원은 복구 화면과 약관만 쓴다', () => {
        expect(withdrawnRedirect('WITHDRAWN', '/write')).toBe('/account/restore');
        expect(withdrawnRedirect('WITHDRAWN', '/account/restore')).toBeNull();
        expect(withdrawnRedirect('WITHDRAWN', '/privacy')).toBeNull();
    });
    it('정상 회원·비회원이 복구 화면에 오면 홈으로', () => {
        expect(withdrawnRedirect('ACTIVE', '/account/restore')).toBe('/');
        expect(withdrawnRedirect(undefined, '/account/restore')).toBe('/');
        expect(withdrawnRedirect('ACTIVE', '/settings')).toBeNull();
    });
});
