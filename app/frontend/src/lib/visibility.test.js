import { describe, expect, it } from 'vitest';
import { isVisibility, VISIBILITIES, VISIBILITY_ICON, VISIBILITY_LABEL } from './visibility';
describe('visibility', () => {
    it('세 값 모두 아이콘과 이름이 있다', () => {
        for (const v of VISIBILITIES) {
            expect(VISIBILITY_ICON[v]).toBeTruthy();
            expect(VISIBILITY_LABEL[v]).toBeTruthy();
        }
        expect(VISIBILITY_ICON.FRIENDS).toBe('👥');
    });
    it('모르는 값은 거른다', () => {
        expect(isVisibility('FRIENDS')).toBe(true);
        expect(isVisibility('friends')).toBe(false);
        expect(isVisibility(null)).toBe(false);
    });
});
