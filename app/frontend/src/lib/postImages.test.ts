import { describe, expect, it } from 'vitest'
import {
  bodyImages, checkImageFile, cleanAlt, fitWidth, fitWithin, forPreview, formatBytes, pendingIds, placeholder,
  removePlaceholder, replacePlaceholder, restorePendingInPreview, setAlt,
} from './postImages'

describe('크기 맞추기', () => {
  it('긴 변을 1920 이하로 줄이고 작은 사진은 그대로 둔다', () => {
    expect(fitWithin(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 })
    expect(fitWithin(3000, 4000, 1920)).toEqual({ width: 1440, height: 1920 })
    expect(fitWithin(800, 600, 1920)).toEqual({ width: 800, height: 600 })
  })
  it('썸네일은 가로 640 이하', () => {
    expect(fitWidth(1920, 1080, 640)).toEqual({ width: 640, height: 360 })
    expect(fitWidth(300, 900, 640)).toEqual({ width: 300, height: 900 })
  })
})

describe('파일 검사', () => {
  it('형식과 크기', () => {
    expect(checkImageFile({ type: 'image/png', size: 100 })).toBeNull()
    expect(checkImageFile({ type: 'image/svg+xml', size: 100 })).toContain('jpg·png·gif·webp')
    expect(checkImageFile({ type: 'image/jpeg', size: 11 * 1024 * 1024 })).toContain('10MB')
  })
})

describe('업로드 대기 표시', () => {
  const md = `앞\n${placeholder('abc123def')}\n뒤 ${placeholder('zzz999yyy', '그림')}`
  it('남은 대기 사진을 찾는다', () => {
    expect(pendingIds(md)).toEqual(['abc123def', 'zzz999yyy'])
  })
  it('올라간 사진은 진짜 주소로, 대체글은 그대로', () => {
    const out = replacePlaceholder(md, 'zzz999yyy', 'https://img.example/images/a.webp')
    expect(out).toContain('![그림](https://img.example/images/a.webp)')
    expect(pendingIds(out)).toEqual(['abc123def'])
  })
  it('실패한 사진 표시를 지운다', () => {
    expect(removePlaceholder(md, 'abc123def')).toBe(`앞\n뒤 ${placeholder('zzz999yyy', '그림')}`)
  })
  it('미리보기에서는 링크로 보냈다가 이 기기 사진으로 바꾼다', () => {
    const sent = forPreview(md)
    expect(sent).toContain('https://pending.invalid/abc123def')
    const html = '<p><a href="https://pending.invalid/abc123def">[이미지] x</a></p>'
    const back = restorePendingInPreview(html, new Map([['abc123def', 'blob:local-1']]))
    expect(back).toContain('<img')
    expect(back).toContain('blob:local-1')
    expect(back).not.toContain('pending.invalid')
  })
})

describe('대체글', () => {
  const md = '![](https://a/1.webp) 글 ![고양이](https://a/2.webp)\n![](local:abcdef12)'
  it('본문 사진 목록', () => {
    expect(bodyImages(md).map((i) => i.alt)).toEqual(['', '고양이', ''])
  })
  it('n번째 사진의 대체글만 바꾼다', () => {
    expect(setAlt(md, 0, '첫 그림')).toBe('![첫 그림](https://a/1.webp) 글 ![고양이](https://a/2.webp)\n![](local:abcdef12)')
    expect(setAlt(md, 2, '대기')).toContain('![대기](local:abcdef12)')
  })
  it('원문 문법을 깨는 글자는 뺀다', () => {
    expect(cleanAlt('a]b[c\nd')).toBe('abc d')
  })
})

describe('formatBytes', () => {
  it('읽기 쉬운 단위', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1GB')
    expect(formatBytes(312 * 1024 * 1024)).toBe('312MB')
    expect(formatBytes(500)).toBe('1KB')
  })
})
