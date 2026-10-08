import { describe, expect, it } from 'vitest';
import { BUG_TEMPLATE, CATEGORIES, categoryLabel, releaseLink, reportedPage, STATUS_HINT, STATUS_LABEL } from './inquiry';
// spec 054: 문의·신고
describe('inquiry', () => {
    it('메뉴를 연 화면 주소는 사이트 안 경로만 남기고 문의 화면 자체는 빼요', () => {
        expect(reportedPage('/@me/posts/3?x=1')).toBe('/@me/posts/3?x=1');
        expect(reportedPage('/support?tab=mine')).toBeNull();
        expect(reportedPage('//evil.example/x')).toBeNull();
        expect(reportedPage('https://evil.example/x')).toBeNull();
        expect(reportedPage(null)).toBeNull();
        expect(reportedPage('/' + 'a'.repeat(600))).toHaveLength(500);
    });
    it('고친 버전은 릴리스 노트의 그 버전 자리로 이어져요', () => {
        expect(releaseLink('1.29.0')).toBe('/releases#v1.29.0');
    });
    it('종류·상태마다 이름과 마우스를 올렸을 때 보일 설명이 있어요', () => {
        expect(CATEGORIES.map((c) => c.code)).toEqual(['QUESTION', 'BUG', 'SUGGESTION', 'REPORT']);
        expect(CATEGORIES.every((c) => c.hint.length > 0)).toBe(true);
        expect(categoryLabel('BUG')).toBe('버그·오류');
        for (const s of ['RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) {
            expect(STATUS_LABEL[s]).toBeTruthy();
            expect(STATUS_HINT[s]).toBeTruthy();
        }
    });
    it('버그 틀은 AI 신고(report_bug)와 같은 순서예요', () => {
        expect(BUG_TEMPLATE.indexOf('무슨 일')).toBeLessThan(BUG_TEMPLATE.indexOf('다시 일어나'));
        expect(BUG_TEMPLATE.indexOf('기대한 결과')).toBeLessThan(BUG_TEMPLATE.indexOf('실제 결과'));
    });
});
