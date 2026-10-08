import { describe, expect, it } from 'vitest';
import { applyFormat, formatForKey } from './mdFormat';
const run = (value, start, end, f) => {
    const e = applyFormat(value, start, end, f);
    const next = value.slice(0, e.from) + e.insert + value.slice(e.to);
    return { next, selected: next.slice(e.selStart, e.selEnd) };
};
describe('applyFormat', () => {
    it('고른 글자를 굵게 감싸고, 다시 누르면 벗긴다', () => {
        const a = run('say hello', 4, 9, 'bold');
        expect(a).toEqual({ next: 'say **hello**', selected: 'hello' });
        expect(run(a.next, 6, 11, 'bold').next).toBe('say hello');
        expect(run('**hi**', 0, 6, 'bold').next).toBe('hi');
    });
    it('고른 글자가 없으면 자리 글자를 넣어 골라 둔다', () => {
        expect(run('', 0, 0, 'italic')).toEqual({ next: '_기울인 글씨_', selected: '기울인 글씨' });
    });
    it('제목은 줄 앞에 붙이고 다른 단계는 바꿔 단다', () => {
        expect(run('a\ntitle\nb', 3, 3, 'h2').next).toBe('a\n## title\nb');
        expect(run('a\n## title\nb', 5, 5, 'h3').next).toBe('a\n### title\nb');
        expect(run('a\n### title\nb', 5, 5, 'h3').next).toBe('a\ntitle\nb');
    });
    it('여러 줄 목록·인용', () => {
        expect(run('x\ny', 0, 3, 'ul').next).toBe('- x\n- y');
        expect(run('x\ny', 0, 3, 'ol').next).toBe('1. x\n2. y');
        expect(run('1. x\n2. y', 0, 9, 'ol').next).toBe('x\ny');
        expect(run('first\n\nsecond', 0, 13, 'ol').next).toBe('1. first\n\n2. second');
        expect(run('x', 0, 1, 'quote').next).toBe('> x');
    });
    it('링크는 주소 자리를 골라 둔다', () => {
        expect(run('devlog', 0, 6, 'link')).toEqual({ next: '[devlog](https://)', selected: 'https://' });
    });
    it('코드 블록은 새 줄에서 시작한다', () => {
        expect(run('a b', 2, 3, 'codeblock')).toEqual({ next: 'a \n```\nb\n```\n', selected: 'b' });
    });
});
describe('formatForKey', () => {
    it('Ctrl+B·I·K', () => {
        expect(formatForKey('b')).toBe('bold');
        expect(formatForKey('I')).toBe('italic');
        expect(formatForKey('k')).toBe('link');
        expect(formatForKey('s')).toBeNull();
    });
});
