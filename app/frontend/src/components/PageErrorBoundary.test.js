import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageErrorBoundary } from './PageErrorBoundary';
function Boom() { throw new Error('chunk'); }
describe('PageErrorBoundary', () => {
    afterEach(() => { document.body.innerHTML = ''; });
    it('화면을 못 받으면 안내를 띄우고, 주소가 바뀌면 다시 그린다', () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        const el = document.createElement('div');
        document.body.appendChild(el);
        const root = createRoot(el);
        act(() => root.render(_jsx(PageErrorBoundary, { path: "/write", children: _jsx(Boom, {}) })));
        expect(el.textContent).toContain('화면을 불러오지 못했어요');
        act(() => root.render(_jsx(PageErrorBoundary, { path: "/", children: _jsx("p", { children: "\uD648" }) })));
        expect(el.textContent).toBe('홈');
        act(() => root.unmount());
    });
});
