import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { clock } from '../lib/format';
import { Modal } from './Modal';
import { TextDiff } from './TextDiff';
import { t, tNodes } from '../lib/i18n';
/**
 * 저장된 내용과 편집 중인 내용을 나란히 비교 (docs/04 §2-7). 색만으로 구분하지 않고 −/+ 기호를 붙인다.
 * 버튼 이름에 결과를 적고, 되돌릴 수 없는 덮어쓰기에만 확인을 한 번 더 받는다.
 */
export function ConflictDialog({ server, mine, onOverwrite, onLoadServer, onSaveAsNew, onClose }) {
    const [confirming, setConfirming] = useState(false);
    const savedAt = clock(server.savedAt);
    return (_jsxs(Modal, { labelledBy: "conflict-title", onClose: onClose, wide: true, children: [_jsxs("header", { className: "dialog-header", children: [_jsx("h2", { id: "conflict-title", children: t('저장된 내용과 지금 편집 중인 내용이 달라요') }), _jsx("button", { type: "button", className: "btn btn-text", "aria-label": t('닫고 계속 편집'), onClick: onClose, children: "\u2715" })] }), server.title !== mine.title && (_jsxs("div", { className: "diff-title", children: [_jsx("div", { children: _jsxs("span", { className: "diff-del", children: ["\u2212 ", server.title || t('(제목 없음)')] }) }), _jsx("div", { children: _jsxs("span", { className: "diff-add", children: ["+ ", mine.title || t('(제목 없음)')] }) })] })), _jsx(TextDiff, { before: server.contentMd, after: mine.contentMd, beforeLabel: t('저장된 내용 · {0} (다른 탭·기기)', { 0: savedAt }), afterLabel: t('지금 편집 중인 내용 · 이 탭') }), confirming ? (_jsxs("footer", { className: "dialog-footer", children: [_jsx("p", { children: tNodes('{0}에 저장된 내용이 지금 편집 중인 내용으로 바뀌어요. 정말 저장할까요?', { 0: savedAt }) }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: onOverwrite, children: t('저장') }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setConfirming(false), children: t('취소') })] })) : (_jsxs("footer", { className: "dialog-footer", children: [_jsx("button", { type: "button", className: "btn btn-primary", onClick: () => setConfirming(true), children: t('편집 중인 내용으로 저장') }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: onLoadServer, children: t('저장된 내용 불러오기') }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: onSaveAsNew, children: t('새 임시글로 따로 저장') })] }))] }));
}
