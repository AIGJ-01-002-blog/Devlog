import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { diffLines, diffWordsWithSpace } from 'diff';
import { useMemo } from 'react';
/**
 * 두 글을 줄 단위로 나란히 비교한다 (충돌 창 docs/04 §2-7, 수정 이력 054). 색만으로 구분하지 않고 −/+ 기호를 붙인다.
 * 좁은 화면에서는 두 칸이 위아래로 쌓인다(.diff 미디어 쿼리).
 */
export function TextDiff({ before, after, beforeLabel, afterLabel }) {
    const rows = useMemo(() => buildRows(before, after), [before, after]);
    return (_jsxs("div", { className: "diff", children: [_jsxs("div", { className: "diff-col", children: [_jsx("h3", { children: beforeLabel }), _jsx("pre", { children: rows.map((r, i) => _jsx(Line, { row: r, side: "left" }, i)) })] }), _jsxs("div", { className: "diff-col", children: [_jsx("h3", { children: afterLabel }), _jsx("pre", { children: rows.map((r, i) => _jsx(Line, { row: r, side: "right" }, i)) })] })] }));
}
/** 바뀐 줄 수 (−/+ 요약용). */
export function changedLines(before, after) {
    let added = 0;
    let removed = 0;
    for (const p of diffLines(before, after)) {
        if (p.added)
            added += p.count ?? 0;
        else if (p.removed)
            removed += p.count ?? 0;
    }
    return { added, removed };
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
