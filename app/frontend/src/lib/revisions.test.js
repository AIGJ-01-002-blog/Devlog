import { describe, expect, it } from 'vitest';
import { revisionLabel } from './revisions';
describe('수정 이력 이름 (055)', () => {
    const item = (no) => ({ no, title: 't', createdAt: '2026-10-08T00:00:00Z', length: 1 });
    it('최근 판과 첫 판을 구분한다', () => {
        expect(revisionLabel(item(3), 3)).toBe('3판 · 지금 발행본');
        expect(revisionLabel(item(1), 3)).toBe('1판 · 첫 발행');
        expect(revisionLabel(item(2), 3)).toBe('2판');
        expect(revisionLabel(item(1), 1)).toBe('1판 · 지금 발행본');
    });
});
