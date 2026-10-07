import { describe, expect, it } from 'vitest';
import { neighbors, seriesNameError, seriesPath } from './series';
const nav = (index) => ({
    id: 1, name: '모음', slug: '모음', handle: 'min', index,
    posts: [1, 2, 3].map((id) => ({ id, title: `t${id}`, url: `/@min/posts/${id}` })),
});
describe('series', () => {
    it('이전·다음 글은 순서로 정한다', () => {
        expect(neighbors(nav(1))).toEqual({ prev: null, next: nav(1).posts[1] });
        expect(neighbors(nav(2)).prev?.id).toBe(1);
        expect(neighbors(nav(2)).next?.id).toBe(3);
        expect(neighbors(nav(3)).next).toBeNull();
        expect(neighbors(nav(null))).toEqual({ prev: null, next: null });
    });
    it('이름 검사는 서버 규칙과 같다', () => {
        expect(seriesNameError('  ')).toBe('시리즈 이름을 써 주세요.');
        expect(seriesNameError('!!')).toBe('글자나 숫자를 넣어 주세요.');
        expect(seriesNameError('가'.repeat(50))).toBeNull();
        expect(seriesNameError('가'.repeat(51))).toContain('50자');
        expect(seriesNameError('Spring 입문')).toBeNull();
    });
    it('주소는 한글 이름도 인코딩한다', () => {
        expect(seriesPath('min', '스프링-입문')).toBe('/@min/series/%EC%8A%A4%ED%94%84%EB%A7%81-%EC%9E%85%EB%AC%B8');
    });
});
