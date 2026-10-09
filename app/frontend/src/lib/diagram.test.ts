import { afterEach, describe, expect, it, vi } from 'vitest'

const render = vi.fn(async (_id: string, src: string) => {
  if (src.includes('잘못')) throw new Error('parse error')
  return { svg: '<svg data-test="ok"><g></g></svg>' }
})
const initialize = vi.fn()
vi.mock('mermaid', () => ({ default: { render, initialize } }))

import { label, renderDiagramsWithin } from './diagram'

function body(html: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'markdown'
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

describe('Mermaid 다이어그램 (spec 071)', () => {
  afterEach(() => { document.body.innerHTML = ''; render.mockClear(); initialize.mockClear() })

  it('mermaid 코드 블록만 그림으로 바꾸고 다른 코드는 그대로 둔다', async () => {
    const el = body('<pre><code class="language-mermaid">flowchart LR\n  A --&gt; B</code></pre><pre><code class="language-java">int a;</code></pre>')
    await renderDiagramsWithin(el)
    const fig = el.querySelector('figure.diagram')!
    const image = fig.querySelector('[role="img"]')!
    expect(image.getAttribute('aria-label')).toBe('다이어그램: 흐름도')
    expect(image.querySelector('svg[data-test="ok"]')).not.toBeNull()
    // 그림 내용은 원문으로 읽을 수 있고, 원문은 다시 그리지 않는다
    expect(fig.querySelector('details.diagram-source code')!.textContent).toBe('flowchart LR\n  A --> B')
    await renderDiagramsWithin(el)
    expect(render).toHaveBeenCalledTimes(1)
    expect(el.querySelector('code.language-java')).not.toBeNull()
    expect(render.mock.calls[0][1]).toBe('flowchart LR\n  A --> B')
    expect(initialize.mock.calls[0][0]).toMatchObject({ securityLevel: 'strict', startOnLoad: false, suppressErrorRendering: true })
  })

  it('그리지 못하면 코드를 그대로 두고 안내를 붙이며, 다시 불러도 두 번 그리지 않는다', async () => {
    const el = body('<pre><code class="language-mermaid">잘못된 그림</code></pre>')
    await renderDiagramsWithin(el)
    await renderDiagramsWithin(el)
    expect(el.querySelector('code.language-mermaid')).not.toBeNull()
    expect(el.querySelectorAll('.diagram-error')).toHaveLength(1)
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('다이어그램이 없으면 mermaid를 부르지 않는다', async () => {
    await renderDiagramsWithin(body('<p>글</p>'))
    expect(initialize).not.toHaveBeenCalled()
  })

  it('종류를 모르면 그냥 다이어그램이라고 읽는다', () => {
    expect(label('sequenceDiagram\n A->>B: hi')).toBe('다이어그램: 순서도')
    expect(label('something')).toBe('다이어그램')
  })
})
