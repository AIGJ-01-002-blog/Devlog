import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { aiErrorText, visibleSuggestions } from './aiTags'

describe('AI 태그 추천', () => {
  it('이미 붙인 태그를 빼고 남은 자리만큼만 보여 준다', () => {
    expect(visibleSuggestions(['a', 'b', 'c'], ['b'], 10)).toEqual(['a', 'c'])
    expect(visibleSuggestions(['a', 'b', 'c'], ['x', 'y', 'z', 'w', 'v', 'u', 'q', 'r', 's'], 10)).toEqual(['a'])
    expect(visibleSuggestions(['a'], Array.from({ length: 10 }, (_, i) => `t${i}`), 10)).toEqual([])
  })

  it('실패 이유별 안내', () => {
    expect(aiErrorText(new ApiError(400, 'AI_TOO_SHORT', ''))).toBe('글을 조금 더 쓴 뒤 추천받아 보세요.')
    expect(aiErrorText(new ApiError(429, 'AI_DAILY_LIMIT', ''))).toContain('오늘 AI 추천 횟수를 다 썼어요')
    expect(aiErrorText(new ApiError(503, 'AI_BUSY', ''))).toBe('잠시 후 다시 시도해 주세요.')
    expect(aiErrorText(new ApiError(503, 'AI_UNAVAILABLE', ''))).toBe('지금은 추천할 수 없어요.')
    expect(aiErrorText(new Error('network'))).toBe('지금은 추천할 수 없어요.')
  })
})
