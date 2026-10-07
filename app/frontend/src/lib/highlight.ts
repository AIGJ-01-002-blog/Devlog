// 코드 블록 강조. 코드가 있을 때만 highlight.js를 불러온다 (docs/40 §2). 실패해도 글은 읽힌다(FR-007).
export async function highlightWithin(root: HTMLElement | null): Promise<void> {
  if (!root) return
  const blocks = root.querySelectorAll<HTMLElement>('pre code')
  if (blocks.length === 0) return
  try {
    const { default: hljs } = await import('highlight.js/lib/common')
    blocks.forEach((b) => {
      if (b.dataset.highlighted) return
      hljs.highlightElement(b)
    })
  } catch {
    // 강조 표시가 없어도 코드는 그대로 보인다
  }
}
