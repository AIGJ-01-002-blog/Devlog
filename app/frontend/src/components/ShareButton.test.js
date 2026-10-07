import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareButton } from './ShareButton';
describe('ShareButton', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });
    it('누르면 글 전체 주소를 복사하고 잠깐 알린다', async () => {
        ;
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        vi.useFakeTimers();
        const writeText = vi.fn(async () => { });
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        const el = document.createElement('div');
        document.body.appendChild(el);
        act(() => createRoot(el).render(_jsx(ShareButton, { path: "/@minseo/42", title: "\uC81C\uBAA9" })));
        const status = el.querySelector('[role="status"]');
        expect(status.textContent).toBe('');
        await act(async () => { el.querySelector('button').click(); });
        expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/@minseo/42`);
        expect(status.textContent).toBe('링크를 복사했어요');
        act(() => { vi.advanceTimersByTime(3000); });
        expect(status.textContent).toBe('');
    });
    it('복사할 수 없으면 직접 복사하라고 알린다', async () => {
        ;
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        vi.stubGlobal('navigator', {});
        const el = document.createElement('div');
        document.body.appendChild(el);
        act(() => createRoot(el).render(_jsx(ShareButton, { path: "/@minseo/42", title: "\uC81C\uBAA9" })));
        await act(async () => { el.querySelector('button').click(); });
        const status = el.querySelector('[role="status"]');
        expect(status.textContent).toContain('복사하지 못했어요');
        expect(status.className).toContain('error');
    });
});
