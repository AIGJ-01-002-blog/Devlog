import { describe, expect, it } from 'vitest';
import { normalizeBio } from './SettingsPage';
describe('소개 정리', () => {
    it('서버와 같이 빈 줄을 하나로 줄이고 앞뒤 공백을 지운다', () => {
        expect(normalizeBio('  안녕\r\n\r\n\r\n\r\n주소  ')).toBe('안녕\n\n주소');
        expect(normalizeBio('a  \nb')).toBe('a\nb');
        expect(normalizeBio('   ')).toBe('');
    });
});
