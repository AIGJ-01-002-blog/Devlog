import css from '../styles.css?raw'
import { describe, expect, it } from 'vitest'

/** 움직임 줄이기 블록 하나가 화면 전체를 덮는지 확인한다(화면마다 따로 두면 빠뜨리기 쉽다). */
function reducedMotionBlocks(): string[] {
  return css.split('@media (prefers-reduced-motion: reduce)').slice(1)
}

describe('움직임 줄이기', () => {
  it('한 곳에서 모든 전환·애니메이션을 끈다', () => {
    const blocks = reducedMotionBlocks()
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatch(/\*, \*::before, \*::after \{[^}]*transition-duration: 0\.01ms !important/)
    expect(blocks[0]).toMatch(/animation-duration: 0\.01ms !important/)
    expect(blocks[0]).toMatch(/scroll-behavior: auto !important/)
  })

  it('카드·목차는 위치·크기를 바꾸지 않아 따로 멈출 것이 없다 (068)', () => {
    expect(css).not.toMatch(/\.card[^{]*:(hover|focus-within)[^{]*\{[^}]*transform/)
    expect(css).not.toMatch(/\.toc-inner a\.active \{[^}]*transform/)
  })

  it('키보드 초점도 마우스처럼 카드 테두리로 보인다', () => {
    expect(css).toMatch(/\.card:focus-within \{ border-color: var\(--color-focus\)/)
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\.card:hover \{ border-color/)
  })
})
