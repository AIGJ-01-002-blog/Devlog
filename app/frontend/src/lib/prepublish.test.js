import { describe, expect, it } from 'vitest';
import { codeFences, emptyLinks, prepublishChecks, proseLength, repeatsTitle } from './prepublish';
const base = { title: '제목', contentMd: '', summary: '', tags: [], thumbnail: { kind: 'auto' } };
describe('발행 전 점검 (057)', () => {
    it('비어 있는 글은 소개·태그·사진·길이를 알린다', () => {
        const ids = prepublishChecks(base).map((c) => `${c.id}:${c.level}`);
        expect(ids).toEqual(['summary:info', 'tags:warn', 'thumbnail:info', 'length:info']);
    });
    it('잘 갖춘 글은 모두 통과한다', () => {
        const items = prepublishChecks({
            ...base, summary: '소개', tags: ['react'],
            contentMd: '![로그인 화면](https://x.test/a.png)\n\n' + '가'.repeat(250) + '\n\n```ts\nconst a = 1\n```\n',
        });
        expect(items.every((c) => c.level === 'ok')).toBe(true);
        expect(items.map((c) => c.id)).toEqual(['summary', 'tags', 'thumbnail', 'alt']);
    });
    it('대체글 없는 사진, 겹치는 제목, 빈 링크를 짚는다', () => {
        const items = prepublishChecks({ ...base, contentMd: '# 제목\n\n![](https://x.test/a.png) [링크]()' });
        expect(items.find((c) => c.id === 'alt')?.text).toBe('대체글이 없는 사진 1장');
        expect(items.some((c) => c.id === 'heading')).toBe(true);
        expect(items.find((c) => c.id === 'links')?.level).toBe('warn');
    });
    it('썸네일을 없애면 사진이 있어도 대표 사진이 없다', () => {
        const items = prepublishChecks({ ...base, thumbnail: { kind: 'none' }, contentMd: '![a](https://x.test/a.png)' });
        expect(items.find((c) => c.id === 'thumbnail')?.level).toBe('info');
    });
    it('코드 블록: 닫히지 않음과 언어 없음', () => {
        expect(codeFences('```\na\n```')).toEqual({ unclosed: false, noLang: 1 });
        expect(codeFences('```js\na')).toEqual({ unclosed: true, noLang: 0 });
        expect(codeFences('````md\n```\nin\n```\n````')).toEqual({ unclosed: false, noLang: 0 });
    });
    it('글자 수는 코드·주소·문법 기호를 빼고 센다', () => {
        expect(proseLength('## 안녕\n```\n코드코드\n```\n[링크](https://very.long/url)')).toBe('안녕링크'.length);
    });
    it('보조 함수', () => {
        expect(emptyLinks('[a]() ![b]( ) [c](x)')).toBe(2);
        expect(emptyLinks('```js\nfns[0]()\n```\n[a]()')).toBe(1);
        expect(proseLength('````md\n```\n안쪽\n```\n````\n바깥')).toBe(2);
        expect(repeatsTitle('JPA 정리', '\n# JPA 정리\n본문')).toBe(true);
        expect(repeatsTitle('JPA 정리', '## JPA 정리')).toBe(false);
    });
});
