import { describe, expect, it } from 'vitest';
import { cleanHandleInput, passwordOk, passwordRules } from './password';
const failed = (p, email = '') => passwordRules(p, email).filter((r) => !r.ok).map((r) => r.id);
describe('passwordRules', () => {
    it('규칙에 맞으면 모두 통과', () => {
        expect(passwordOk('Blog!pass77', 'kim@example.com')).toBe(true);
    });
    it('8자 미만·16자 초과는 길이 위반', () => {
        expect(failed('Ab1!efg')).toEqual(['length']);
        expect(failed('Abcdefgh1!abcdefg')).toEqual(['length']);
    });
    it('영문·숫자·특수문자가 각각 있어야 한다', () => {
        expect(failed('12345678!')).toEqual(['letter']);
        expect(failed('abcdefg!!')).toEqual(['digit']);
        expect(failed('Abcdefgh1')).toEqual(['special']);
    });
    it('공백·한글은 쓸 수 없다', () => {
        expect(failed('Abc 1234!')).toContain('chars');
        expect(failed('Abc한글123!')).toContain('chars');
    });
    it('이메일 앞부분이 들어가면 안 된다', () => {
        expect(failed('Xkim7550!', 'KIM755@naver.com')).toEqual(['email']);
    });
});
describe('cleanHandleInput', () => {
    it('대문자는 소문자로, - 와 다른 글자는 지운다', () => {
        expect(cleanHandleInput('Kim-Min.Seo_1')).toBe('kimminseo_1');
    });
    it('한글 자판으로 친 글자는 영문 자리로 바꾼다', () => {
        expect(cleanHandleInput('ㅏㅑㅡ')).toBe('kim');
    });
});
