import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { applyFormat, MD_TOOLS } from '../lib/mdFormat';
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
/**
 * 본문 위 서식 도구 (spec 054). 버튼마다 툴팁에 이름과 단축키가 보인다.
 * insertText로 바꿔 Ctrl+Z 되돌리기가 한 단계로 남고, 그게 안 되는 환경에서는 onChange로 값을 넘긴다.
 */
export function applyMdEdit(el, edit, onChange) {
    el.focus();
    el.setSelectionRange(edit.from, edit.to);
    let done = false;
    try {
        done = document.execCommand('insertText', false, edit.insert);
    }
    catch {
        done = false;
    }
    // insertText가 input 이벤트를 꼭 내지는 않아(MDN) 성공했어도 바뀐 값을 상태에 넘긴다
    const applied = done && el.value.slice(edit.from, edit.from + edit.insert.length) === edit.insert;
    onChange(applied ? el.value : el.value.slice(0, edit.from) + edit.insert + el.value.slice(edit.to));
    requestAnimationFrame(() => el.setSelectionRange(edit.selStart, edit.selEnd));
}
export function formatTextarea(el, format, onChange) {
    applyMdEdit(el, applyFormat(el.value, el.selectionStart, el.selectionEnd, format), onChange);
}
export function MarkdownToolbar({ bodyRef, onChange }) {
    return (_jsx("div", { className: "md-toolbar", role: "toolbar", "aria-label": "\uC11C\uC2DD", children: MD_TOOLS.map((t, i) => (_jsxs("span", { className: "md-tool-wrap", children: [(i === 3 || i === 6 || i === 9) && _jsx("span", { className: "md-sep", "aria-hidden": "true" }), _jsx("button", { type: "button", className: `md-tool md-${t.format}`, "aria-label": t.label, "data-tip": t.key ? `${t.label} (${MOD}${t.key.toUpperCase()})` : t.label, 
                    // 누를 때 본문 초점·선택이 풀리지 않게
                    onMouseDown: (e) => e.preventDefault(), onClick: () => { if (bodyRef.current)
                        formatTextarea(bodyRef.current, t.format, onChange); }, children: _jsx("span", { "aria-hidden": "true", children: t.icon }) })] }, t.format))) }));
}
