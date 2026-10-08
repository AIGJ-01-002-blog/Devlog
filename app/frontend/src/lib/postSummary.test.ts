import { describe, expect, it } from 'vitest'
import { isPublishField, normalizeSummary, summaryLength } from './postSummary'

describe('짧은 소개', () => {
  it('서버와 같이 줄바꿈·연속 공백을 한 칸으로 줄인다', () => {
    expect(normalizeSummary('  짧게\n\n소개하는   글  ')).toBe('짧게 소개하는 글')
    expect(normalizeSummary(' \n ')).toBe('')
  })

  it('글자 수는 정리한 값을 코드 포인트로 센다', () => {
    expect(summaryLength('😀'.repeat(150))).toBe(150)
    expect(summaryLength('가\n\n\n나')).toBe(3)
  })

  it('태그·소개·썸네일 오류는 발행 창 안에 보여 준다', () => {
    expect(isPublishField('tags[0]')).toBe(true)
    expect(isPublishField('summary')).toBe(true)
    expect(isPublishField('thumbnail')).toBe(true)
    expect(isPublishField('title')).toBe(false)
  })
})
