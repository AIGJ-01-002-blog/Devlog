import { describe, expect, it } from 'vitest';
import { change, isStaff, pageCount, roleLabel } from './admin';
describe('관리자 페이지 (062)', () => {
    it('관리자와 매니저만 관리자 페이지를 쓴다', () => {
        expect(isStaff('ADMIN')).toBe(true);
        expect(isStaff('MANAGER')).toBe(true);
        expect(isStaff('USER')).toBe(false);
        expect(isStaff(undefined)).toBe(false);
    });
    it('권한 이름은 한국어로, 모르는 값은 일반 회원', () => {
        expect(roleLabel('MANAGER')).toBe('매니저');
        expect(roleLabel('ADMIN')).toBe('관리자');
        expect(roleLabel('X')).toBe('일반 회원');
    });
    it('이전 기간 대비 변화를 퍼센트로 보여 준다', () => {
        expect(change(120, 100)).toEqual({ text: '+20%', trend: 'up' });
        expect(change(50, 100)).toEqual({ text: '-50%', trend: 'down' });
        expect(change(3, 0)).toEqual({ text: '새로 생김', trend: 'up' });
        expect(change(0, 0)).toEqual({ text: '', trend: 'flat' });
        expect(change(5, 5)).toEqual({ text: '변화 없음', trend: 'flat' });
        expect(change(1001, 1000)).toEqual({ text: '변화 없음', trend: 'flat' });
    });
    it('쪽 수는 최소 1쪽', () => {
        expect(pageCount(0, 20)).toBe(1);
        expect(pageCount(41, 20)).toBe(3);
    });
});
