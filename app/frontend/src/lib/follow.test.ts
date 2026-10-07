import { describe, expect, it } from 'vitest'
import { appendPeople, emptyFollowText, followLabel, type FollowPerson } from './follow'

const person = (id: number): FollowPerson => ({ id, handle: `h${id}`, nickname: `n${id}`, bioFirstLine: null, profileImageUrl: null, following: false, me: false })

describe('follow', () => {
  it('버튼 글자는 상태와 마우스·초점으로 정한다', () => {
    expect(followLabel(false, false)).toBe('팔로우')
    expect(followLabel(false, true)).toBe('팔로우')
    expect(followLabel(true, false)).toBe('팔로잉 ✓')
    expect(followLabel(true, true)).toBe('언팔로우')
  })

  it('목록 빈 문구', () => {
    expect(emptyFollowText('followers')).toBe('아직 팔로워가 없어요')
    expect(emptyFollowText('following')).toBe('아직 팔로우한 사람이 없어요')
  })

  it('이어 붙일 때 같은 사람은 건너뛴다', () => {
    expect(appendPeople([person(1), person(2)], [person(2), person(3)]).map((p) => p.id)).toEqual([1, 2, 3])
  })
})
