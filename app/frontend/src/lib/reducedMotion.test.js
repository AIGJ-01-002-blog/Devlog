import css from '../styles.css?raw';
import { describe, expect, it } from 'vitest';
/** 움직임 줄이기 블록 하나가 화면 전체를 덮는지 확인한다(화면마다 따로 두면 빠뜨리기 쉽다). */
function reducedMotionBlocks() {
    return css.split('@media (prefers-reduced-motion: reduce)').slice(1);
}
describe('움직임 줄이기', () => {
    it('한 곳에서 모든 전환·애니메이션을 끈다', () => {
        const blocks = reducedMotionBlocks();
        expect(blocks).toHaveLength(1);
        expect(blocks[0]).toMatch(/\*, \*::before, \*::after \{[^}]*transition-duration: 0\.01ms !important/);
        expect(blocks[0]).toMatch(/animation-duration: 0\.01ms !important/);
        expect(blocks[0]).toMatch(/scroll-behavior: auto !important/);
    });
    it('떠오르는 카드와 커지는 목차 항목도 멈춘다', () => {
        const block = reducedMotionBlocks()[0];
        for (const selector of ['.card:hover', '.card:focus-within', '.toc-inner a.active'])
            expect(block).toContain(selector);
    });
    it('키보드 초점도 마우스와 같이 카드를 띄운다', () => {
        expect(css).toMatch(/\.card:hover, \.card:focus-within \{ transform: translateY\(-8px\)/);
    });
});
