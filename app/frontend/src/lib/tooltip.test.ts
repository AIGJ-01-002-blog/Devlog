// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { findTipTarget, placeTip, tipText, visibleText } from './tooltip'

const html = (s: string) => {
  const d = document.createElement('div')
  d.innerHTML = s
  return d.firstElementChild!
}

describe('tipText', () => {
  it('data-tip을 가장 먼저 쓴다', () => {
    expect(tipText(html('<button aria-label="검색" data-tip="글·사람 검색">🔍</button>'))).toBe('글·사람 검색')
  })
  it('아이콘만 있는 버튼은 aria-label을 보여 준다', () => {
    expect(tipText(html('<button aria-label="알림"><svg aria-hidden="true"></svg></button>'))).toBe('알림')
  })
  it('보이는 글자와 같은 이름은 되풀이하지 않는다', () => {
    expect(tipText(html('<button aria-label="로그인">로그인</button>'))).toBeNull()
    expect(tipText(html('<button>로그인</button>'))).toBeNull()
  })
  it('화면 읽기 전용 글자만 있으면 보이는 글자가 없는 것으로 본다', () => {
    const el = html('<button><img alt=""><span class="sr-only">내 메뉴</span></button>')
    expect(visibleText(el)).toBe('')
    expect(tipText(html('<button aria-label="내 메뉴"><span class="sr-only">내 메뉴</span></button>'))).toBe('내 메뉴')
  })
  it('title도 읽고, data-tip=""은 끈다', () => {
    expect(tipText(html('<time title="2026년 10월 8일">방금 전</time>'))).toBe('2026년 10월 8일')
    expect(tipText(html('<button aria-label="닫기" data-tip="">✕</button>'))).toBeNull()
  })
})

describe('findTipTarget', () => {
  it('아이콘을 가리켜도 감싼 버튼을 찾는다', () => {
    const b = html('<button aria-label="알림"><svg><path></path></svg></button>')
    expect(findTipTarget(b.querySelector('path'))).toBe(b)
  })
  it('글이 없는 대상은 건너뛰고 바깥 대상을 본다', () => {
    const outer = html('<span title="좋아요 3개"><a href="/x">3</a></span>')
    expect(findTipTarget(outer.querySelector('a'))).toBe(outer)
    expect(findTipTarget(html('<p>그냥 글</p>'))).toBeNull()
  })
})

describe('placeTip', () => {
  const vp = { width: 375, height: 700 }
  it('요소 위 가운데에 둔다', () => {
    expect(placeTip({ top: 100, left: 100, width: 40, height: 40 }, { width: 60, height: 24 }, vp)).toEqual({ top: 68, left: 90, side: 'top' })
  })
  it('위에 자리가 없으면 아래로', () => {
    expect(placeTip({ top: 10, left: 100, width: 40, height: 40 }, { width: 60, height: 24 }, vp).side).toBe('bottom')
  })
  it('화면 오른쪽 끝 버튼은 화면 안으로 당긴다', () => {
    const p = placeTip({ top: 100, left: 345, width: 30, height: 30 }, { width: 200, height: 24 }, vp)
    expect(p.left + 200).toBeLessThanOrEqual(375 - 8)
  })
})
