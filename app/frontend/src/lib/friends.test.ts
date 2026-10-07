import { describe, expect, it } from 'vitest'
import { lastActiveLabel } from './friends'

describe('lastActiveLabel', () => {
  it('네 가지 구간으로만 보여 준다', () => {
    expect(lastActiveLabel(0)).toBe('오늘')
    expect(lastActiveLabel(1)).toBe('어제')
    expect(lastActiveLabel(3)).toBe('3일 전')
    expect(lastActiveLabel(6)).toBe('6일 전')
    expect(lastActiveLabel(7)).toBe('1주 이상')
  })
  it('기록이 없으면 표시하지 않는다', () => {
    expect(lastActiveLabel(null)).toBeNull()
    expect(lastActiveLabel(undefined)).toBeNull()
  })
})
