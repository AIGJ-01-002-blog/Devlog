import { describe, expect, it } from 'vitest';
import { normalizeBio } from './SettingsPage';
describe('소개 정리', () => {
    it('서버와 같이 빈 줄을 하나로 줄이고 앞뒤 공백을 지운다', () => {
        expect(normalizeBio('  안녕\r\n\r\n\r\n\r\n주소  ')).toBe('안녕\n\n주소');
        expect(normalizeBio('a  \nb')).toBe('a\nb');
        expect(normalizeBio('   ')).toBe('');
    });
});
describe('내 설정 탭 (063)', () => {
    it('주소 뒤 #이름으로 탭을 고르고, 모르는 값은 프로필로 연다', async () => {
        const { tabFromHash, SETTINGS_TABS } = await import('./SettingsPage');
        expect(SETTINGS_TABS.map((t) => t.id)).toEqual(['profile', 'account', 'notifications', 'friends', 'ai', 'export']);
        expect(tabFromHash('#ai')).toBe('ai');
        expect(tabFromHash('#export')).toBe('export');
        expect(tabFromHash('#notifications')).toBe('notifications');
        expect(tabFromHash('#telegram')).toBe('notifications');
        expect(tabFromHash('')).toBe('profile');
        expect(tabFromHash('#nope')).toBe('profile');
        expect(tabFromHash('#%E0')).toBe('profile');
    });
});
