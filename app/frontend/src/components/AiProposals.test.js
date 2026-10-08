import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiProposals } from './AiProposals';
// spec 061: AI가 남긴 글 제안은 임시글 탭 위에 보이고, 임시글로 만들거나 넘긴다
const proposal = { id: 7, title: 'Redis 분산 락', scope: '- 왜 두 번 돌았나\n- SET NX', tags: ['redis'], createdAt: '2026-10-08T00:00:00Z' };
describe('AiProposals', () => {
    let root;
    let host;
    let list;
    beforeEach(() => {
        ;
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        document.cookie = 'XSRF-TOKEN=test';
        host = document.createElement('div');
        document.body.appendChild(host);
        root = createRoot(host);
        list = [proposal, { ...proposal, id: 8, title: '넘길 제안', tags: [] }];
        vi.stubGlobal('fetch', vi.fn(async (url, init) => {
            if (url.endsWith('/draft'))
                return new Response(JSON.stringify({ postId: 42 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.endsWith('/dismiss') && init?.method === 'POST')
                return new Response(null, { status: 204 });
            return new Response(JSON.stringify(list), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
    });
    afterEach(() => {
        act(() => root.unmount());
        host.remove();
        vi.unstubAllGlobals();
    });
    it('제안이 없으면 아무것도 그리지 않는다', async () => {
        list = [];
        await act(async () => { root.render(_jsx(AiProposals, {})); });
        expect(host.innerHTML).toBe('');
    });
    it('불러오지 못하면 오류와 다시 시도를 보여 준다', async () => {
        let fail = true;
        vi.stubGlobal('fetch', vi.fn(async () => (fail ? new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } })
            : new Response(JSON.stringify(list), { status: 200, headers: { 'Content-Type': 'application/json' } }))));
        await act(async () => { root.render(_jsx(AiProposals, {})); });
        expect(host.textContent).toContain('불러오지 못했어요');
        fail = false;
        await act(async () => { [...host.querySelectorAll('button')].find((b) => b.textContent === '다시 시도').click(); });
        expect(host.querySelectorAll('.ai-proposal')).toHaveLength(2);
    });
    it('넘기면 목록에서 빠지고, 임시글로 만들면 편집 화면으로 간다', async () => {
        await act(async () => { root.render(_jsx(AiProposals, {})); });
        expect(host.textContent).toContain('AI가 제안한 글');
        expect(host.textContent).toContain('- 왜 두 번 돌았나');
        expect(host.textContent).toContain('#redis');
        const buttons = () => [...host.querySelectorAll('button')];
        // 버튼마다 무엇을 하는지 툴팁이 있다
        expect(buttons().every((b) => b.title.length > 0)).toBe(true);
        await act(async () => { buttons().filter((b) => b.textContent === '넘기기')[1].click(); });
        expect(host.textContent).not.toContain('넘길 제안');
        expect(host.querySelectorAll('.ai-proposal')).toHaveLength(1);
        await act(async () => { buttons().find((b) => b.textContent === '임시글로 만들기').click(); });
        expect(window.location.pathname).toBe('/write/42');
    });
});
