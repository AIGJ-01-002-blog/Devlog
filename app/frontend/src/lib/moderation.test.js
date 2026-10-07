import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { reasonLabel, reasonSummary, reportErrorText, suspensionPeriod } from './moderation';
describe('moderation', () => {
    it('사유 이름과 요약은 정해진 순서', () => {
        expect(reasonLabel('PRIVACY')).toBe('개인정보 노출');
        expect(reasonLabel(null)).toBe('기타');
        expect(reasonSummary({ OTHER: 1, SPAM: 3 })).toBe('스팸·광고 3 · 기타 1');
        expect(reasonSummary({})).toBe('');
    });
    it('정지 기한', () => {
        const f = (iso) => iso.slice(0, 10);
        expect(suspensionPeriod({ id: 1, reason: 'x', startedAt: '2026-10-01T00:00:00Z', endsAt: null, liftedAt: null }, f))
            .toBe('2026-10-01 ~ 영구');
        expect(suspensionPeriod({ id: 1, reason: 'x', startedAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-08T00:00:00Z', liftedAt: '2026-10-03T00:00:00Z' }, f))
            .toBe('2026-10-01 ~ 2026-10-08까지 · 2026-10-03 해제');
    });
    it('신고 실패 안내', () => {
        expect(reportErrorText(new ApiError(400, 'CANNOT_REPORT_OWN', 'x'))).toBe('자기 글이나 댓글은 신고할 수 없어요.');
        expect(reportErrorText(new Error('net'))).toContain('보내지 못했어요');
    });
});
