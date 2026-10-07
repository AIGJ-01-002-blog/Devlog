/** 경로가 바뀌어도, 화면을 불러오는 동안에도 남아 있는 본문 자리. App이 모든 화면을 이 안에 그린다. */
export const MAIN_ID = 'main-content'

/**
 * 화면 안에서 주소를 옮기면 화면 읽기 프로그램은 바뀐 줄 모르고 이전 자리(누른 링크)에 머문다.
 * 본문 자리로 초점을 옮겨 거기서부터 읽게 한다. 이 자리는 불러오는 중 표시에서 실제 화면으로 바뀌어도
 * 그대로 있으므로 초점이 사라지지 않는다. 화면 이동 때는 스크롤을 건드리지 않고(scroll=false),
 * 건너뛰기 링크처럼 사용자가 본문으로 가려 할 때만 그 자리까지 스크롤한다.
 */
export function focusMain(root: ParentNode = document, { scroll = false }: { scroll?: boolean } = {}): boolean {
  const main = root.querySelector<HTMLElement>(`#${MAIN_ID}`) ?? root.querySelector<HTMLElement>('main')
  if (!main) return false
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
  main.focus({ preventScroll: true })
  if (scroll) main.scrollIntoView({ block: 'start' })
  return true
}
