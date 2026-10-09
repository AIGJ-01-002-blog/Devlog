import { describe, expect, it } from 'vitest'
import { readRatio } from './ReadProgress'

describe('readRatio', () => {
  it('본문 위끝이 화면 위에 있으면 0, 아래끝이 화면 아래에 닿으면 1', () => {
    expect(readRatio(200, 3000, 800)).toBe(0)
    expect(readRatio(-1100, 3000, 800)).toBeCloseTo(0.5)
    expect(readRatio(-2200, 3000, 800)).toBe(1)
    expect(readRatio(-5000, 3000, 800)).toBe(1)
  })
  it('본문이 화면보다 짧으면 지나갔을 때만 1', () => {
    expect(readRatio(100, 400, 800)).toBe(0)
    expect(readRatio(-10, 400, 800)).toBe(1)
  })
})
