// Mermaid 다이어그램 (spec 071). 본문의 ```mermaid 코드 블록을 글 화면에서 그림으로 그린다.
// 서버는 코드 블록을 그대로 저장·정화하고(language-mermaid), 그림은 읽는 화면이 그린다. 그래서 어느 AI 앱이 쓴 글이든 같은 그림이 나온다.
// mermaid는 크므로 다이어그램이 있는 글에서만 불러온다. 그리지 못하면 코드 블록을 그대로 두고 한 줄 안내를 붙인다.
const SELECTOR = 'pre > code.language-mermaid';
let seq = 0;
function dark() {
    const set = document.documentElement.getAttribute('data-theme');
    if (set)
        return set === 'dark';
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
export async function renderDiagramsWithin(root) {
    if (!root)
        return;
    const blocks = Array.from(root.querySelectorAll(SELECTOR)).filter((b) => !b.dataset.diagram);
    if (blocks.length === 0)
        return;
    blocks.forEach((b) => { b.dataset.diagram = 'pending'; });
    let mermaid;
    try {
        mermaid = (await import('mermaid')).default;
        // strict: 그림 안의 HTML·스크립트·클릭 동작을 막는다
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark() ? 'dark' : 'default', fontFamily: 'inherit' });
    }
    catch {
        blocks.forEach((b) => failed(b));
        return;
    }
    for (const code of blocks) {
        const pre = code.parentElement;
        if (!pre || !pre.isConnected)
            continue;
        const source = code.textContent ?? '';
        try {
            const { svg } = await mermaid.render(`mermaid-${++seq}`, source);
            if (!pre.isConnected)
                continue;
            const figure = document.createElement('figure');
            figure.className = 'diagram';
            figure.setAttribute('role', 'img');
            figure.setAttribute('aria-label', label(source));
            figure.innerHTML = svg; // securityLevel strict에서 mermaid가 DOMPurify로 정화한 SVG
            pre.replaceWith(figure);
        }
        catch {
            failed(code);
        }
    }
}
function failed(code) {
    code.dataset.diagram = 'failed';
    const pre = code.parentElement;
    if (!pre || pre.nextElementSibling?.classList.contains('diagram-error'))
        return;
    const note = document.createElement('p');
    note.className = 'diagram-error muted small';
    note.textContent = '다이어그램을 그리지 못해 코드로 보여 드려요.';
    pre.after(note);
}
/** 화면 낭독기용 이름: 첫 줄의 종류(flowchart, sequenceDiagram …)를 붙인다 */
export function label(source) {
    const kind = source.trim().split(/\s+/)[0] ?? '';
    const names = {
        flowchart: '흐름도', graph: '흐름도', sequenceDiagram: '순서도', classDiagram: '클래스 다이어그램', erDiagram: 'ERD',
        stateDiagram: '상태 다이어그램', 'stateDiagram-v2': '상태 다이어그램', gantt: '간트 차트', pie: '원그래프', mindmap: '마인드맵',
        timeline: '타임라인', gitGraph: 'Git 그래프', journey: '사용자 여정',
    };
    return names[kind] ? `다이어그램: ${names[kind]}` : '다이어그램';
}
