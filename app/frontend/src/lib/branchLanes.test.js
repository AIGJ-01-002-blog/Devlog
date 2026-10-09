import { describe, expect, it } from 'vitest';
import { branchLanes, branchLabel, dayLabel } from './branchLanes';
function card(id, branch) {
    return {
        id, url: `/@a/posts/${id}`, title: `글 ${id}`, excerpt: null, thumbnailUrl: null, firstPublicAt: '2026-10-09T00:00:00Z',
        publishedAt: '2026-10-09T00:00:00Z', visibility: 'PUBLIC', commentCount: 0, likeCount: 0, viewCount: 0, tags: [],
        author: { id: 1, handle: 'a', nickname: 'a', profileImageUrl: null },
        branch: branch ? { kind: 'TOPIC', name: '검색', index: 1, total: 2, url: '/', ...branch } : undefined,
    };
}
describe('branchLanes (072)', () => {
    it('브랜치 글은 같은 줄로 이어지고 1편에서 main으로 갈라진다', () => {
        const rows = branchLanes([card(5, { key: 't1', index: 2 }), card(4), card(3, { key: 't1', index: 1 })], false);
        expect(rows.map((r) => r.lane)).toEqual([1, 0, 1]);
        expect(rows[0].segments).toEqual([{ lane: 1, kind: 'TOPIC', top: false, bottom: true, fork: false }]);
        expect(rows[1].segments).toEqual([{ lane: 1, kind: 'TOPIC', top: true, bottom: true, fork: false }]);
        expect(rows[2].segments).toEqual([{ lane: 1, kind: 'TOPIC', top: true, bottom: false, fork: true }]);
        expect(rows[1].above).toEqual([{ lane: 1, kind: 'TOPIC' }]);
        expect(rows[0].mainTop).toBe(false);
        expect(rows[2].mainBottom).toBe(false);
    });
    it('1편이 아직 안 보이고 다음 쪽이 남았으면 아래로 열어 둔다', () => {
        const rows = branchLanes([card(9, { key: 's2', kind: 'SERIES', index: 3, total: 3 }), card(8)], true);
        expect(rows[0].segments[0]).toMatchObject({ bottom: true, fork: false });
        expect(rows[1].segments[0]).toMatchObject({ lane: 1, top: true, bottom: true, fork: false });
        expect(rows[1].mainBottom).toBe(true);
    });
    it('줄이 모자라면 넘친 브랜치는 main에 점을 찍는다', () => {
        const rows = branchLanes([
            card(10, { key: 'a', index: 2 }), card(9, { key: 'b', index: 2 }), card(8, { key: 'c', index: 2 }),
            card(7, { key: 'd', index: 2 }), card(6, { key: 'd', index: 1 }), card(5, { key: 'a', index: 1 }),
            card(4, { key: 'b', index: 1 }), card(3, { key: 'c', index: 1 }),
        ], false, 3);
        expect(rows[3]).toMatchObject({ lane: 0, overflow: true, dot: 'TOPIC' });
        expect(rows.slice(0, 3).map((r) => r.lane)).toEqual([1, 2, 3]);
    });
    it('끝난 브랜치의 줄은 다음 브랜치가 다시 쓴다', () => {
        const rows = branchLanes([card(4, { key: 'a', index: 2 }), card(3, { key: 'a', index: 1 }), card(2, { key: 'b', index: 2 }),
            card(1, { key: 'b', index: 1 })], false);
        expect(rows.map((r) => r.lane)).toEqual([1, 1, 1, 1]);
        expect(rows[2].segments[0]).toMatchObject({ top: false, bottom: true });
    });
    it('한 편뿐인 시리즈는 브랜치로 그리지 않는다', () => {
        const rows = branchLanes([card(1, { key: 's1', kind: 'SERIES', index: 1, total: 1 })], false);
        expect(rows[0]).toMatchObject({ lane: 0, dot: 'main', overflow: false, segments: [] });
    });
    it('이름표와 날짜 줄', () => {
        expect(branchLabel({ kind: 'SERIES', key: 's1', name: 'devlog 만들기', index: 3, total: 3, url: '' })).toBe('devlog 만들기 시리즈, 3편');
        expect(branchLabel({ kind: 'TOPIC', key: 't1', name: '검색', index: 1, total: 2, url: '' })).toBe('검색 브랜치 시작');
        expect(branchLabel({ kind: 'TOPIC', key: 't1', name: '검색', index: 2, total: 2, url: '' })).toBe('검색 브랜치, 2편 중 2편');
        const now = new Date(2026, 9, 9, 12);
        expect(dayLabel(new Date(2026, 9, 9, 1).toISOString(), now)).toBe('오늘');
        expect(dayLabel(new Date(2026, 9, 8, 23).toISOString(), now)).toBe('어제');
        expect(dayLabel(new Date(2026, 9, 2).toISOString(), now)).toBe('10월 2일');
        expect(dayLabel(new Date(2025, 9, 2).toISOString(), now)).toBe('2025년 10월 2일');
    });
});
