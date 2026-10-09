import { beforeEach, describe, expect, it } from 'vitest';
import { branchChips, branchNeighbors, markRead, READ_KEEP, readPosts, seriesProgress } from './branch';
describe('읽은 글 (072)', () => {
    beforeEach(() => localStorage.clear());
    it('연 글을 기억하고 같은 글은 한 번만 센다', () => {
        markRead(3);
        markRead(5);
        markRead(3);
        expect([...readPosts()]).toEqual([5, 3]);
    });
    it('넘치면 오래된 것부터 잊는다', () => {
        for (let i = 1; i <= READ_KEEP + 2; i++)
            markRead(i);
        const read = readPosts();
        expect(read.size).toBe(READ_KEEP);
        expect(read.has(1)).toBe(false);
        expect(read.has(READ_KEEP + 2)).toBe(true);
    });
    it('저장된 값이 깨져 있으면 빈 목록', () => {
        localStorage.setItem('devlog:read-posts', '{oops');
        expect(readPosts().size).toBe(0);
    });
    it('이어 읽을 글은 읽지 않은 첫 글이다', () => {
        const posts = [{ id: 1 }, { id: 2 }, { id: 3 }];
        expect(seriesProgress(posts, new Set([1, 3]))).toEqual({ done: 2, next: { id: 2 } });
        expect(seriesProgress(posts, new Set([1, 2, 3]))).toEqual({ done: 3, next: null });
    });
});
describe('branchNeighbors', () => {
    const nav = { kind: 'TOPIC', key: 't1', name: 'x', url: '/?branch=t1', index: 2,
        posts: [1, 2, 3].map((id) => ({ id, title: `${id}`, url: `/p/${id}` })) };
    it('앞뒤 글', () => {
        expect(branchNeighbors(nav).prev?.id).toBe(1);
        expect(branchNeighbors(nav).next?.id).toBe(3);
        expect(branchNeighbors({ ...nav, index: null })).toEqual({ prev: null, next: null });
    });
});
describe('홈 브랜치 버튼 (072)', () => {
    const s1 = { kind: 'SERIES', key: 's1', name: 'devlog 설계 노트', total: 3 };
    const s2 = { kind: 'SERIES', key: 's2', name: 'devlog 만들기 — 기술 스택 이야기', total: 14 };
    const t9 = { kind: 'TOPIC', key: 't9', name: 'pgvector', total: 2 };
    const card = (branch) => ({ branch });
    const latest = [card(s2), card(null), card(s1), card(s2)];
    it('거르지 않은 목록의 브랜치를 위에서부터 한 번씩', () => {
        expect(branchChips(latest, null).map((b) => b.key)).toEqual(['s2', 's1']);
    });
    it('한 브랜치로 걸러 봐도 다른 브랜치 버튼이 그대로 남는다', () => {
        expect(branchChips(latest, 's1', [card(s1)]).map((b) => b.key)).toEqual(['s2', 's1']);
        expect(branchChips(latest, 's2', [card(s2)]).map((b) => b.key)).toEqual(['s2', 's1']);
    });
    it('고른 브랜치가 묶음에 없으면 보이는 글에서 찾아 맨 앞에', () => {
        expect(branchChips(latest, 't9', [card(t9)]).map((b) => b.key)).toEqual(['t9', 's2', 's1']);
        expect(branchChips(latest, 't9', [card(t9)], 2).map((b) => b.key)).toEqual(['t9', 's2']);
    });
    it('글이 한 편뿐인 브랜치는 버튼을 만들지 않는다', () => {
        expect(branchChips([card({ ...t9, total: 1 })], null)).toEqual([]);
    });
});
