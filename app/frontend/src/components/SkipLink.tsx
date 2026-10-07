import type { MouseEvent } from 'react'
import { focusMain } from '../lib/focusMain'

/** 키보드 사용자가 머리말 메뉴를 건너뛰고 본문으로 바로 가는 첫 링크. 초점을 받을 때만 보인다. */
export function SkipLink() {
  const skip = (e: MouseEvent<HTMLAnchorElement>) => {
    if (focusMain()) e.preventDefault()
  }
  return <a href="#main" className="skip-link" onClick={skip}>본문으로 건너뛰기</a>
}
