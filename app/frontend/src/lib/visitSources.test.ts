import { describe, expect, it } from 'vitest'
import { pageLabel, sourceGroup, sourceLabel } from './visitSources'

describe('visitSources (spec 070)', () => {
  it('유입 경로를 이름과 묶음으로 바꾼다', () => {
    expect(sourceLabel('naver', '')).toBe('네이버')
    expect(sourceGroup('naver')).toBe('search')
    expect(sourceGroup('kakao')).toBe('sns')
    expect(sourceLabel('other', 'blog.example.org')).toBe('blog.example.org')
    expect(sourceLabel('other', '')).toBe('그 밖의 사이트')
    expect(sourceGroup('other')).toBe('other')
  })

  it('화면 주소를 이름으로 바꾼다', () => {
    expect(pageLabel('/', null)).toBe('홈')
    expect(pageLabel('/tags/%EC%9E%90%EB%B0%94', null)).toBe('태그 #자바')
    expect(pageLabel('/@kim/posts/3', '첫 글')).toBe('첫 글')
    expect(pageLabel('/@kim/posts/3', null)).toBe('@kim의 공개하지 않은 글')
    expect(pageLabel('/@kim', null)).toBe('@kim 블로그')
    expect(pageLabel('/@kim/series/java', null)).toBe('@kim 시리즈 java')
  })
})
