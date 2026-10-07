import { describe, expect, it } from 'vitest'
import { AVATAR_COLORS, avatarColor, avatarInitial, contrastRatio } from './avatar'

describe('기본 프로필 아이콘', () => {
  it('8가지 배경색 모두 흰 글자와 4.5:1 이상이다', () => {
    expect(AVATAR_COLORS).toHaveLength(8)
    for (const c of AVATAR_COLORS) expect(contrastRatio(c, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })

  it('같은 주소는 같은 색, 주소가 여러 개면 여러 색이 쓰인다', () => {
    expect(avatarColor('gi-octocat')).toBe(avatarColor('gi-octocat'))
    const used = new Set(Array.from({ length: 64 }, (_, i) => avatarColor(`gi-user${i}`)))
    expect(used.size).toBeGreaterThan(4)
  })

  it('첫 글자는 영문이면 대문자, 한글·이모지는 그대로다', () => {
    expect(avatarInitial('kim')).toBe('K')
    expect(avatarInitial('민서')).toBe('민')
    expect(avatarInitial('😀웃음')).toBe('😀')
    expect(avatarInitial('  ')).toBe('?')
  })
})
