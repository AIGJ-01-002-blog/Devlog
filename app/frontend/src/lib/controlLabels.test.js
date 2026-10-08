import ts from 'typescript';
import { describe, expect, it } from 'vitest';
/**
 * 툴팁·모바일 규칙을 다음 릴리스에서도 지키게 하는 검사 (spec 054).
 * 글자 없이 아이콘·기호만 있는 버튼과 링크는 이름(aria-label·data-tip·title)이 있어야 한다.
 * 이름이 있으면 TooltipLayer가 마우스·키보드 초점에서 그 이름을 말풍선으로 보여 준다.
 */
const sources = import.meta.glob(['../components/**/*.tsx', '../pages/**/*.tsx', '../App.tsx', '!../**/*.test.tsx'], { query: '?raw', import: 'default', eager: true });
const CONTROLS = new Set(['button', 'a', 'Link']);
const NAMES = ['aria-label', 'aria-labelledby', 'data-tip', 'title'];
const LETTER = /[\p{L}\p{N}]/u;
function attrs(el) {
    const m = new Map();
    el.attributes.properties.forEach((p) => { if (ts.isJsxAttribute(p))
        m.set(p.name.getText(), p); });
    return m;
}
/** 눈에 보이는 글자가 있을 수 있는가. {변수}는 글자일 수 있어 있다고 본다. sr-only·svg 안은 보이지 않는다. */
function mayShowText(children) {
    return children.some((c) => {
        if (ts.isJsxText(c))
            return LETTER.test(c.text);
        if (ts.isJsxExpression(c)) {
            if (!c.expression)
                return false;
            return ts.isStringLiteral(c.expression) ? LETTER.test(c.expression.text) : true;
        }
        if (ts.isJsxElement(c)) {
            const open = c.openingElement;
            const tag = open.tagName.getText();
            const cls = attrs(open).get('className')?.initializer?.getText() ?? '';
            if (tag === 'svg' || /sr-only/.test(cls))
                return false;
            return mayShowText(c.children);
        }
        if (ts.isJsxFragment(c))
            return mayShowText(c.children);
        return false;
    });
}
function unnamedIconControls(file, code) {
    const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const bad = [];
    const visit = (n) => {
        const open = ts.isJsxElement(n) ? n.openingElement : ts.isJsxSelfClosingElement(n) ? n : null;
        if (open && CONTROLS.has(open.tagName.getText())) {
            const a = attrs(open);
            const named = NAMES.some((k) => a.has(k)) || open.attributes.properties.some(ts.isJsxSpreadAttribute);
            const text = ts.isJsxElement(n) && mayShowText(n.children);
            if (!named && !text)
                bad.push(`${file}:${sf.getLineAndCharacterOfPosition(open.getStart()).line + 1}`);
        }
        ts.forEachChild(n, visit);
    };
    visit(sf);
    return bad;
}
describe('아이콘 버튼 이름 (054)', () => {
    it('검사할 화면 파일을 읽었다', () => {
        expect(Object.keys(sources).length).toBeGreaterThan(50);
    });
    it('글자 없는 버튼·링크에는 aria-label·data-tip·title이 있다', () => {
        const bad = Object.entries(sources).flatMap(([f, code]) => unnamedIconControls(f, code));
        expect(bad).toEqual([]);
    });
    it('검사가 실제로 잡아낸다', () => {
        expect(unnamedIconControls('x.tsx', 'const a = <button onClick={f}>✕</button>')).toHaveLength(1);
        expect(unnamedIconControls('x.tsx', 'const a = <button><svg /><span className="sr-only">메뉴</span></button>')).toHaveLength(1);
        expect(unnamedIconControls('x.tsx', 'const a = <button aria-label="닫기">✕</button>')).toHaveLength(0);
        expect(unnamedIconControls('x.tsx', 'const a = <button>{label}</button>')).toHaveLength(0);
        expect(unnamedIconControls('x.tsx', 'const a = <Link to="/">홈</Link>')).toHaveLength(0);
        expect(unnamedIconControls('x.tsx', 'const a = <button {...props}>✕</button>')).toHaveLength(0);
    });
});
