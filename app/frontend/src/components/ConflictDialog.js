import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { clock } from '../lib/format';
import { Modal } from './Modal';
import { TextDiff } from './TextDiff';
/**
 * 저장된 내용과 편집 중인 내용을 나란히 비교 (docs/04 §2-7). 색만으로 구분하지 않고 −/+ 기호를 붙인다.
 * 버튼 이름에 결과를 적고, 되돌릴 수 없는 덮어쓰기에만 확인을 한 번 더 받는다.
 */
export function ConflictDialog({ server, mine, onOverwrite, onLoadServer, onSaveAsNew, onClose }) {
    const [confirming, setConfirming] = useState(false);
    const savedAt = clock(server.savedAt);
    return (_jsxs(Modal, { labelledBy: "conflict-title", onClose: onClose, wide: true, children: [_jsxs("header", { className: "dialog-header", children: [_jsx("h2", { id: "conflict-title", children: "\uC800\uC7A5\uB41C \uB0B4\uC6A9\uACFC \uC9C0\uAE08 \uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9\uC774 \uB2EC\uB77C\uC694" }), _jsx("button", { type: "button", className: "btn btn-text", "aria-label": "\uB2EB\uACE0 \uACC4\uC18D \uD3B8\uC9D1", onClick: onClose, children: "\u2715" })] }), server.title !== mine.title && (_jsxs("div", { className: "diff-title", children: [_jsx("div", { children: _jsxs("span", { className: "diff-del", children: ["\u2212 ", server.title || '(제목 없음)'] }) }), _jsx("div", { children: _jsxs("span", { className: "diff-add", children: ["+ ", mine.title || '(제목 없음)'] }) })] })), _jsx(TextDiff, { before: server.contentMd, after: mine.contentMd, beforeLabel: `저장된 내용 · ${savedAt} (다른 탭·기기)`, afterLabel: "\uC9C0\uAE08 \uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9 \u00B7 \uC774 \uD0ED" }), confirming ? (_jsxs("footer", { className: "dialog-footer", children: [_jsxs("p", { children: [savedAt, "\uC5D0 \uC800\uC7A5\uB41C \uB0B4\uC6A9\uC774 \uC9C0\uAE08 \uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9\uC73C\uB85C \uBC14\uB00C\uC5B4\uC694. \uC815\uB9D0 \uC800\uC7A5\uD560\uAE4C\uC694?"] }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: onOverwrite, children: "\uC800\uC7A5" }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setConfirming(false), children: "\uCDE8\uC18C" })] })) : (_jsxs("footer", { className: "dialog-footer", children: [_jsx("button", { type: "button", className: "btn btn-primary", onClick: () => setConfirming(true), children: "\uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9\uC73C\uB85C \uC800\uC7A5" }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: onLoadServer, children: "\uC800\uC7A5\uB41C \uB0B4\uC6A9 \uBD88\uB7EC\uC624\uAE30" }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: onSaveAsNew, children: "\uC0C8 \uC784\uC2DC\uAE00\uB85C \uB530\uB85C \uC800\uC7A5" })] }))] }));
}
