import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdjacentPosts } from './AdjacentPosts';
function respond(body, status = 200) {
    const fetch = vi.fn(async (_url, _init) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    return fetch;
}
async function render(postId) {
    ;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(_jsx(AdjacentPosts, { postId: postId })); });
    return el;
}
describe('AdjacentPosts', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.unstubAllGlobals();
    });
    it('이전·다음 글을 rel 링크로 그린다', async () => {
        const fetch = respond({ prev: { id: 1, title: '옛 글', url: '/@a/posts/1' }, next: { id: 3, title: '새 글', url: '/@a/posts/3' } });
        const el = await render(2);
        expect(String(fetch.mock.calls[0][0])).toContain('/api/posts/2/adjacent');
        const links = [...el.querySelectorAll('a')];
        expect(links.map((a) => [a.getAttribute('rel'), a.getAttribute('href'), a.querySelector('b').textContent]))
            .toEqual([['prev', '/@a/posts/1', '옛 글'], ['next', '/@a/posts/3', '새 글']]);
        expect(el.querySelector('nav').getAttribute('aria-label')).toBe('이전 글과 다음 글');
    });
    it('한쪽만 있으면 그쪽만 그린다', async () => {
        respond({ prev: null, next: { id: 3, title: '새 글', url: '/@a/posts/3' } });
        const el = await render(2);
        expect([...el.querySelectorAll('a')].map((a) => a.getAttribute('rel'))).toEqual(['next']);
    });
    it('이웃이 없거나 실패하면 아무것도 그리지 않는다', async () => {
        respond({ prev: null, next: null });
        expect((await render(2)).innerHTML).toBe('');
        respond({ code: 'NOT_FOUND' }, 404);
        expect((await render(5)).innerHTML).toBe('');
    });
});
