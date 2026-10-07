import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { diffLines, diffWordsWithSpace } from 'diff';
import { useMemo, useState } from 'react';
import { clock } from '../lib/format';
/**
 * 저장된 내용과 편집 중인 내용을 나란히 비교 (docs/04 §2-7). 색만으로 구분하지 않고 −/+ 기호를 붙인다.
 * 버튼 이름에 결과를 적고, 되돌릴 수 없는 덮어쓰기에만 확인을 한 번 더 받는다.
 */
export function ConflictDialog({ server, mine, onOverwrite, onLoadServer, onSaveAsNew, onClose }) {
    const [confirming, setConfirming] = useState(false);
    const rows = useMemo(() => buildRows(server.contentMd, mine.contentMd), [server.contentMd, mine.contentMd]);
    const savedAt = clock(server.savedAt);
    return (_jsx("div", { className: "dialog-backdrop", role: "presentation", children: _jsxs("div", { className: "dialog dialog-wide", role: "dialog", "aria-modal": "true", "aria-labelledby": "conflict-title", children: [_jsxs("header", { className: "dialog-header", children: [_jsx("h2", { id: "conflict-title", children: "\uC800\uC7A5\uB41C \uB0B4\uC6A9\uACFC \uC9C0\uAE08 \uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9\uC774 \uB2EC\uB77C\uC694" }), _jsx("button", { type: "button", className: "btn btn-text", "aria-label": "\uB2EB\uACE0 \uACC4\uC18D \uD3B8\uC9D1", onClick: onClose, children: "\u2715" })] }), server.title !== mine.title && (_jsxs("div", { className: "diff-title", children: [_jsx("div", { children: _jsxs("span", { className: "diff-del", children: ["\u2212 ", server.title || '(제목 없음)'] }) }), _jsx("div", { children: _jsxs("span", { className: "diff-add", children: ["+ ", mine.title || '(제목 없음)'] }) })] })), _jsxs("div", { className: "diff", children: [_jsxs("div", { className: "diff-col", children: [_jsxs("h3", { children: ["\uC800\uC7A5\uB41C \uB0B4\uC6A9 \u00B7 ", savedAt, " (\uB2E4\uB978 \uD0ED\u00B7\uAE30\uAE30)"] }), _jsx("pre", { children: rows.map((r, i) => _jsx(Line, { row: r, side: "left" }, i)) })] }), _jsxs("div", { className: "diff-col", children: [_jsx("h3", { children: "\uC9C0\uAE08 \uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9 \u00B7 \uC774 \uD0ED" }), _jsx("pre", { children: rows.map((r, i) => _jsx(Line, { row: r, side: "right" }, i)) })] })] }), confirming ? (_jsxs("footer", { className: "dialog-footer", children: [_jsxs("p", { children: [savedAt, "\uC5D0 \uC800\uC7A5\uB41C \uB0B4\uC6A9\uC774 \uC9C0\uAE08 \uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9\uC73C\uB85C \uBC14\uB00C\uC5B4\uC694. \uC815\uB9D0 \uC800\uC7A5\uD560\uAE4C\uC694?"] }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: onOverwrite, children: "\uC800\uC7A5" }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setConfirming(false), children: "\uCDE8\uC18C" })] })) : (_jsxs("footer", { className: "dialog-footer", children: [_jsx("button", { type: "button", className: "btn btn-primary", onClick: () => setConfirming(true), children: "\uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9\uC73C\uB85C \uC800\uC7A5" }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: onLoadServer, children: "\uC800\uC7A5\uB41C \uB0B4\uC6A9 \uBD88\uB7EC\uC624\uAE30" }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: onSaveAsNew, children: "\uC0C8 \uC784\uC2DC\uAE00\uB85C \uB530\uB85C \uC800\uC7A5" })] }))] }) }));
}
function buildRows(oldText, newText) {
    const parts = diffLines(oldText, newText);
    const rows = [];
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const next = parts[i + 1];
        if (p.removed && next?.added) {
            rows.push({ kind: 'change', left: p.value, right: next.value });
            i++;
        }
        else if (p.removed)
            rows.push({ kind: 'del', left: p.value, right: '' });
        else if (p.added)
            rows.push({ kind: 'add', left: '', right: p.value });
        else
            rows.push({ kind: 'same', left: p.value, right: p.value });
    }
    return rows;
}
function Line({ row, side }) {
    if (row.kind === 'same') {
        const text = row.left;
        const lines = text.split('\n');
        // 바뀌지 않은 긴 구간은 접는다
        if (lines.length > 8) {
            return _jsxs("span", { className: "diff-same", children: [lines.slice(0, 3).join('\n'), '\n', _jsxs("span", { className: "diff-fold", children: ["\u22EF \uAC19\uC740 \uB0B4\uC6A9 ", lines.length - 6, "\uC904 \u22EF"] }), '\n', lines.slice(-3).join('\n')] });
        }
        return _jsx("span", { className: "diff-same", children: text });
    }
    if (row.kind === 'change') {
        const words = diffWordsWithSpace(row.left, row.right);
        return (_jsxs("span", { className: side === 'left' ? 'diff-del' : 'diff-add', children: [side === 'left' ? '− ' : '+ ', words.filter((w) => (side === 'left' ? !w.added : !w.removed)).map((w, i) => (w.added || w.removed) ? _jsx("mark", { children: w.value }, i) : _jsx("span", { children: w.value }, i))] }));
    }
    const text = side === 'left' ? row.left : row.right;
    if (!text)
        return _jsx("span", { className: "diff-gap", children: '\n'.repeat(Math.max(0, (row.left || row.right).split('\n').length - 1)) });
    return _jsxs("span", { className: row.kind === 'del' ? 'diff-del' : 'diff-add', children: [row.kind === 'del' ? '− ' : '+ ', text] });
}
