import { describe, expect, it } from 'vitest'
import { initialThumbnail, thumbnailPreview, thumbnailRequest } from './postThumbnail'

describe('썸네일 고르기', () => {
  it('에디터 정보로 고른 상태를 만든다', () => {
    expect(initialThumbnail({ thumbnailUrl: null, thumbnailHidden: false })).toEqual({ kind: 'auto' })
    expect(initialThumbnail({ thumbnailUrl: 'https://x/a.png', thumbnailHidden: false })).toEqual({ kind: 'image', url: 'https://x/a.png' })
    expect(initialThumbnail({ thumbnailUrl: null, thumbnailHidden: true })).toEqual({ kind: 'none' })
  })

  it('발행 요청에는 고른 주소와 없애기만 보낸다', () => {
    expect(thumbnailRequest({ kind: 'auto' })).toEqual({ thumbnailUrl: null, thumbnailHidden: false })
    expect(thumbnailRequest({ kind: 'image', url: 'u' })).toEqual({ thumbnailUrl: 'u', thumbnailHidden: false })
    expect(thumbnailRequest({ kind: 'none' })).toEqual({ thumbnailUrl: null, thumbnailHidden: true })
  })

  it('자동이면 올리는 중인 사진을 빼고 본문 첫 사진을 미리 보여 준다', () => {
    const md = '![](local:abcdef12)\n\n![a](https://img/1.png)\n\n![](https://img/2.png)'
    expect(thumbnailPreview({ kind: 'auto' }, md)).toBe('https://img/1.png')
    expect(thumbnailPreview({ kind: 'auto' }, '사진 없음')).toBeNull()
    expect(thumbnailPreview({ kind: 'none' }, md)).toBeNull()
    expect(thumbnailPreview({ kind: 'image', url: 'https://img/9.png' }, md)).toBe('https://img/9.png')
  })
})
