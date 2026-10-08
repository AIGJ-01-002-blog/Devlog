import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthAuthorizePage } from './OAuthAuthorizePage';
// spec 052: 앱 이름은 누구나 정할 수 있으므로, 동의 화면은 확인하지 않은 앱임을 알리고 돌아갈 주소를 크게 보인다.
describe('OAuthAuthorizePage', () => {
    let root;
    let host;
    beforeEach(() => {
        ;
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        host = document.createElement('div');
        document.body.appendChild(host);
        root = createRoot(host);
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ clientName: 'ChatGPT', redirectHost: 'evil.example', scope: 'READ' }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    });
    afterEach(() => {
        act(() => root.unmount());
        host.remove();
        vi.unstubAllGlobals();
    });
    it('확인하지 않은 앱 표시와 돌아갈 주소를 보이고, 읽기 범위면 쓰기 항목은 없다', async () => {
        await act(async () => { root.render(_jsx(OAuthAuthorizePage, {})); });
        expect(host.querySelector('.oauth-unverified')?.textContent).toContain('devlog가 확인하지 않은 앱');
        expect(host.querySelector('.oauth-host strong')?.textContent).toBe('evil.example');
        expect(host.textContent).not.toContain('임시글 만들기');
    });
});
