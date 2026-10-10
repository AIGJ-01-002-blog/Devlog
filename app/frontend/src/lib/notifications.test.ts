import { describe, expect, it } from 'vitest'
import { badgeLabel, badgeText, messageOf, type NotificationItem } from './notifications'

const base: NotificationItem = {
  id: 1, type: 'COMMENT', read: false, at: '2026-10-07T00:00:00Z',
  actor: { nickname: '민서', handle: 'gi-minseo', withdrawn: false }, othersCount: 0,
  post: { id: 3, title: 'JPA N+1 정리', readable: true }, commentPreview: '좋은 글', link: '/@a/posts/3',
}

describe('notifications', () => {
  it('배지는 99+까지, 화면 낭독기 이름', () => {
    expect(badgeText(0)).toBeNull()
    expect(badgeText(3)).toBe('3')
    expect(badgeText(100)).toBe('99+')
    expect(badgeLabel(3)).toBe('안 읽은 알림 3개')
    expect(badgeLabel(0)).toBe('알림')
  })

  it('종류별 문구', () => {
    expect(messageOf(base)).toEqual({ who: '민서님', text: '이 「JPA N+1 정리」에 댓글을 남겼어요', quote: '좋은 글' })
    expect(messageOf({ ...base, type: 'LIKE', othersCount: 3, commentPreview: null }).who).toBe('민서님 외 3명')
    expect(messageOf({ ...base, type: 'REPLY' }).text).toBe('이 회원님의 댓글에 답글을 남겼어요')
  })

  it('친구 요청·수락 (015 A-1)', () => {
    const friend = { ...base, post: null, commentPreview: null, link: '/settings#friends' }
    expect(messageOf({ ...friend, type: 'FRIEND_REQUEST' })).toEqual({ who: '민서님', text: '이 친구 요청을 보냈어요', quote: null })
    expect(messageOf({ ...friend, type: 'FRIEND_ACCEPTED' }).text).toBe('이 친구 요청을 수락했어요')
  })

  it('볼 수 없는 글·탈퇴한 사용자', () => {
    expect(messageOf({ ...base, post: { id: null, title: null, readable: false }, link: null }).text).toBe('볼 수 없는 글이에요')
    expect(messageOf({ ...base, actor: { nickname: null, handle: null, withdrawn: true } }).who).toBe('탈퇴한 사용자님')
  })

  it('신고 처리 결과와 숨김 (019)', () => {
    const sys = { ...base, actor: null, commentPreview: null }
    expect(messageOf({ ...sys, type: 'REPORT_RESOLVED', result: 'ACTION_TAKEN' }).text).toContain('조치했어요')
    expect(messageOf({ ...sys, type: 'REPORT_RESOLVED', result: 'NO_VIOLATION' }).text).toContain('위반은 아니었어요')
    const hidden = { ...sys, type: 'CONTENT_HIDDEN' as const }
    expect(messageOf({ ...hidden, hidden: { targetType: 'POST', reason: 'SPAM', stillHidden: true } }).text)
      .toBe('회원님의 글「JPA N+1 정리」이(가) 운영 정책에 따라 숨겨졌어요 (사유: 스팸·광고)')
    expect(messageOf({ ...hidden, hidden: { targetType: 'COMMENT', reason: null, stillHidden: false } }).text)
      .toBe('회원님의 댓글이 운영 정책에 따라 숨겨졌었어요 (지금은 다시 보여요)')
  })

  it('문의 답변 (054)', () => {
    const sys = { ...base, actor: null, commentPreview: null, post: null, type: 'INQUIRY_ANSWERED' as const }
    expect(messageOf({ ...sys, inquiry: { id: 3, title: '태그 개수', status: 'CLOSED' } }).text).toBe('남기신 문의「태그 개수」에 답변이 왔어요')
    expect(messageOf(sys).text).toBe('남기신 문의에 답변이 왔어요')
  })
})
