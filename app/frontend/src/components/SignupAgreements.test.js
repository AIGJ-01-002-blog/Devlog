import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { SignupAgreements } from './SignupAgreements';
let latest = { terms: false, privacy: false, ai: false };
function Harness() {
    const [value, setValue] = useState({ terms: false, privacy: false, ai: false });
    latest = value;
    return _jsx(SignupAgreements, { value: value, onChange: setValue });
}
async function render() {
    ;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(_jsx(Harness, {})); });
    return el;
}
const boxes = (el) => [...el.querySelectorAll('input[type=checkbox]')];
describe('SignupAgreements (가입 AI 동의 분리)', () => {
    it('AI 동의는 선택 항목으로 따로 있고, 필수 둘만 켜도 AI는 꺼진 채다', async () => {
        const el = await render();
        expect(el.textContent).toContain('(선택) AI 기능 이용 동의');
        const [, terms, privacy, ai] = boxes(el);
        await act(async () => { terms.click(); privacy.click(); });
        expect(latest).toEqual({ terms: true, privacy: true, ai: false });
        expect(ai.checked).toBe(false);
    });
    it('"모두 동의"는 세 항목을 함께 켜고 끈다', async () => {
        const el = await render();
        const [all] = boxes(el);
        await act(async () => { all.click(); });
        expect(latest).toEqual({ terms: true, privacy: true, ai: true });
        await act(async () => { all.click(); });
        expect(latest).toEqual({ terms: false, privacy: false, ai: false });
    });
    it('AI 하나만 끄면 "모두 동의"도 꺼진다', async () => {
        const el = await render();
        const [all, , , ai] = boxes(el);
        await act(async () => { all.click(); });
        await act(async () => { ai.click(); });
        expect(latest).toEqual({ terms: true, privacy: true, ai: false });
        expect(all.checked).toBe(false);
    });
});
