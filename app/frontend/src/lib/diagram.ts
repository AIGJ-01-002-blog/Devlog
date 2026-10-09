// Mermaid 다이어그램 (spec 071). 본문의 ```mermaid 코드 블록을 글 화면에서 그림으로 그린다.
// 서버는 코드 블록을 그대로 저장·정화하고(language-mermaid), 그림은 읽는 화면이 그린다. 그래서 어느 AI 앱이 쓴 글이든 같은 그림이 나온다.
// mermaid는 크므로 다이어그램이 있는 글에서만 불러온다. 그리지 못하면 코드 블록을 그대로 두고 한 줄 안내를 붙인다.

const SELECTOR = 'pre > code.language-mermaid'
let seq = 0

function dark(): boolean {
  const set = document.documentElement.getAttribute('data-theme')
  if (set) return set === 'dark'
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export async function renderDiagramsWithin(root: HTMLElement | null): Promise<void> {
  if (!root) return
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR)).filter((b) => !b.dataset.diagram)
  if (blocks.length === 0) return
  blocks.forEach((b) => { b.dataset.diagram = 'pending' })
  let mermaid: typeof import('mermaid').default
  try {
    mermaid = (await import('mermaid')).default
    // strict: 그림 안의 HTML·스크립트·클릭 동작을 막는다
    // suppressErrorRendering: 문법 오류 때 mermaid가 body에 오류 그림을 남기지 않게 한다(미리보기에서 쌓이지 않게)
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, theme: dark() ? 'dark' : 'default', fontFamily: 'inherit' })
  } catch {
    blocks.forEach((b) => failed(b))
    return
  }
  for (const code of blocks) {
    const pre = code.parentElement
    if (!pre || !pre.isConnected) continue
    const source = code.textContent ?? ''
    try {
      const { svg } = await mermaid.render(`mermaid-${++seq}`, source)
      if (!pre.isConnected) continue
      pre.replaceWith(figureFor(svg, source))
    } catch {
      failed(code)
    }
  }
}

/**
 * 그림과 원문을 함께 둔다. 그림은 이름만 읽히므로, 화면 낭독기·복사용으로 원문 코드를 접어서 붙인다.
 * 원문 code에는 data-diagram을 달아 다시 그리거나 구문 강조하지 않게 한다.
 */
function figureFor(svg: string, source: string): HTMLElement {
  const figure = document.createElement('figure')
  figure.className = 'diagram'
  const image = document.createElement('div')
  image.className = 'diagram-image'
  image.setAttribute('role', 'img')
  image.setAttribute('aria-label', label(source))
  image.innerHTML = svg // securityLevel strict에서 mermaid가 DOMPurify로 정화한 SVG
  const details = document.createElement('details')
  details.className = 'diagram-source'
  const summary = document.createElement('summary')
  summary.textContent = '다이어그램 코드 보기'
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  code.className = 'language-mermaid'
  code.dataset.diagram = 'source'
  code.textContent = source
  pre.appendChild(code)
  details.append(summary, pre)
  figure.append(image, details)
  return figure
}

function failed(code: HTMLElement) {
  code.dataset.diagram = 'failed'
  const pre = code.parentElement
  if (!pre || pre.nextElementSibling?.classList.contains('diagram-error')) return
  const note = document.createElement('p')
  note.className = 'diagram-error muted small'
  note.textContent = '다이어그램을 그리지 못해 코드로 보여 드려요.'
  pre.after(note)
}

/** 화면 낭독기용 이름: 첫 줄의 종류(flowchart, sequenceDiagram …)를 붙인다 */
export function label(source: string): string {
  const kind = source.trim().split(/\s+/)[0] ?? ''
  const names: Record<string, string> = {
    flowchart: '흐름도', graph: '흐름도', sequenceDiagram: '순서도', classDiagram: '클래스 다이어그램', erDiagram: 'ERD',
    stateDiagram: '상태 다이어그램', 'stateDiagram-v2': '상태 다이어그램', gantt: '간트 차트', pie: '원그래프', mindmap: '마인드맵',
    timeline: '타임라인', gitGraph: 'Git 그래프', journey: '사용자 여정',
  }
  return names[kind] ? `다이어그램: ${names[kind]}` : '다이어그램'
}
