/**
 * 화면 안 이동 뒤 화면 읽기 프로그램에 새 화면 이름을 알린다. 초점은 본문 자리(focusMain)에 남아 있지만,
 * 따로 불러오는 화면은 그 자리에 "불러오는 중"이 먼저 그려지고 실제 화면은 조용히 바뀐다.
 * 그래서 본문 자리에 새 제목(h1)이 그려지는 때를 지켜보다가 그 이름을 알린다.
 */
export const ANNOUNCE_PAGE_EVENT = 'announce-page'

/** Link가 이동한 뒤 부른다. 주소만 바꾸는 이동(replace)에서는 부르지 않는다(쓰던 칸을 방해하지 않게). */
export function requestPageAnnouncement(): void {
  window.dispatchEvent(new Event(ANNOUNCE_PAGE_EVENT))
}

function heading(root: ParentNode): string {
  return root.querySelector('h1')?.textContent?.trim() ?? ''
}

/**
 * root 안이 바뀔 때마다 제목을 찾아 처음 찾은 이름을 한 번 알린다. 제목이 끝내 없으면 timeoutMs 뒤 문서 제목을 알린다.
 * 돌려준 함수로 그만 지켜본다(다음 이동이 먼저 오면).
 */
export function watchPageName(root: HTMLElement, announce: (name: string) => void, timeoutMs = 5000): () => void {
  let done = false
  const finish = (name: string) => {
    if (done) return
    stop()
    if (name) announce(name)
  }
  const observer = new MutationObserver(() => {
    const name = heading(root)
    if (name) finish(name)
  })
  const timer = setTimeout(() => finish(heading(root) || document.title), timeoutMs)
  function stop() {
    done = true
    observer.disconnect()
    clearTimeout(timer)
  }
  observer.observe(root, { childList: true, subtree: true, characterData: true })
  return stop
}
