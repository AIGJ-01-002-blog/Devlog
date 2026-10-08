import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { coverGlyph, coverTone, PostCard } from './PostCard';
const card = (over = {}) => ({
    id: 7, url: '/@minseo/posts/7', title: '운영체제 기초', excerpt: '요약', thumbnailUrl: null, firstPublicAt: '2026-10-08T00:00:00Z',
    publishedAt: '2026-10-08T00:00:00Z', visibility: 'PUBLIC', commentCount: 0, likeCount: 0,
    author: { id: 1, handle: 'minseo', nickname: '민서', profileImageUrl: null }, ...over,
});
async function render(c) {
    ;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(_jsx(PostCard, { card: c })); });
    return el;
}
describe('PostCard 표지 (048)', () => {
    it('같은 글은 언제나 같은 색이고 0~3 안에 있다', () => {
        expect([0, 1, 2, 3, 4, 7].map(coverTone)).toEqual([0, 1, 2, 3, 0, 3]);
        expect(coverTone(-1)).toBe(3);
    });
    it('제목 첫 글자를 대문자로, 빈 제목은 #', () => {
        expect(coverGlyph('spring ai')).toBe('S');
        expect(coverGlyph('  운영체제')).toBe('운');
        expect(coverGlyph('🚀 배포')).toBe('🚀');
        expect(coverGlyph('')).toBe('#');
    });
    it('사진이 없으면 그라데이션 표지, 있으면 사진', async () => {
        const empty = await render(card());
        const cover = empty.querySelector('.card-cover');
        expect(cover.getAttribute('data-tone')).toBe('3');
        expect(cover.textContent).toContain('운');
        expect(cover.closest('[aria-hidden="true"]')).not.toBeNull();
        const withImage = await render(card({ thumbnailUrl: '/media/a.webp' }));
        expect(withImage.querySelector('.card-cover')).toBeNull();
        expect(withImage.querySelector('img')?.getAttribute('src')).toBe('/media/a.webp');
    });
});
