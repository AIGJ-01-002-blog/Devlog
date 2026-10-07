/**
 * 본문 GIF 재생 (009 FR-030·FR-031). 서버는 GIF를 "원본으로 가는 링크 + 첫 장면 사진"으로 그린다(정화 허용 목록 그대로).
 * 이 스크립트가 그 링크를 찾아 누르면(Enter 포함) 그 자리에서 원본을 재생하고, 다시 누르면 첫 장면으로 돌아가게 바꾼다.
 * 스크립트가 없으면 링크 그대로 새 탭에서 원본이 열린다.
 */
export function enhanceGifs(root: HTMLElement | null): void {
  if (!root) return
  root.querySelectorAll<HTMLAnchorElement>('a[href$=".gif"]').forEach((a) => {
    const img = a.querySelector('img')
    if (!img || a.dataset.gif || !/_thumb\.(webp|png|jpg)$/.test(img.getAttribute('src') ?? '')) return
    const still = img.getAttribute('src')!
    const original = a.getAttribute('href')!
    a.dataset.gif = 'still'
    a.classList.add('gif-player')
    a.setAttribute('aria-pressed', 'false')
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const playing = a.dataset.gif === 'playing'
      img.src = playing ? still : original
      a.dataset.gif = playing ? 'still' : 'playing'
      a.setAttribute('aria-pressed', String(!playing))
    })
  })
}
