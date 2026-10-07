import { describe, expect, it } from 'vitest'
import { activeIndex, extractToc, readingMinutes } from './toc'

describe('toc', () => {
  it('제목 id로 목차를 만들고 가장 높은 제목을 0단계로 둔다', () => {
    const root = document.createElement('div')
    root.innerHTML = '<h3 id="h-a">가</h3><p>본문</p><h4 id="h-b">나 <code>x</code></h4><h3 id="h-c">다</h3><h2>id 없음</h2><h3 id="h-e"> </h3>'
    expect(extractToc(root)).toEqual([
      { id: 'h-a', text: '가', depth: 0 },
      { id: 'h-b', text: '나 x', depth: 1 },
      { id: 'h-c', text: '다', depth: 0 },
    ])
    expect(extractToc(null)).toEqual([])
  })

  it('기준선을 지난 마지막 제목이 지금 제목이다', () => {
    expect(activeIndex([200, 600], 80)).toBeNull()
    expect(activeIndex([80, 600], 80)).toBe(0)
    expect(activeIndex([-400, 50, 900], 80)).toBe(1)
  })

  it('읽는 시간은 공백을 빼고 500자에 1분, 사진은 10초, 최소 1분', () => {
    expect(readingMinutes('')).toBe(1)
    expect(readingMinutes('가'.repeat(1500))).toBe(3)
    expect(readingMinutes('가 '.repeat(1500))).toBe(3)
    expect(readingMinutes('가'.repeat(1000), 12)).toBe(4)
  })
})
