import { describe, expect, it } from 'vitest';
import { linkTimeLeft } from './telegram';
describe('linkTimeLeft', () => {
    const now = Date.parse('2026-10-07T12:00:00Z');
    it('남은 시간을 분 단위로 올려서 보여 준다', () => {
        expect(linkTimeLeft('2026-10-07T12:10:00Z', now)).toBe('10분 안에 열어 주세요.');
        expect(linkTimeLeft('2026-10-07T12:04:01Z', now)).toBe('5분 안에 열어 주세요.');
        expect(linkTimeLeft('2026-10-07T12:00:30Z', now)).toBe('1분 안에 열어 주세요.');
    });
    it('끝났거나 읽을 수 없으면 null', () => {
        expect(linkTimeLeft('2026-10-07T12:00:00Z', now)).toBeNull();
        expect(linkTimeLeft('2026-10-07T11:59:00Z', now)).toBeNull();
        expect(linkTimeLeft('없는 시각', now)).toBeNull();
    });
});
