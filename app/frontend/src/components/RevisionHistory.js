import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';
import { revisionLabel, revisions } from '../lib/revisions';
import { Modal } from './Modal';
import { changedLines, TextDiff } from './TextDiff';
/**
 * 글 수정 이력 (054). Crowfoot의 "버전 기록"처럼 발행한 판을 고르고 지금 편집 중인 내용과 비교한다.
 * [이 판 불러오기]는 편집기 내용만 바꾼다. 평소처럼 저장되고, 다시 발행해야 독자에게 보인다.
 */
export function RevisionHistory({ postId, current, onLoad, onClose }) {
    const [items, setItems] = useState(null);
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        revisions.list(postId)
            .then((list) => {
            setItems(list);
            if (list.length > 0)
                void pick(list[0].no);
        })
            .catch((e) => setError(e instanceof ApiError ? e.message : '수정 이력을 불러오지 못했어요.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postId]);
    // 판을 빠르게 바꿔 고르면 늦게 온 앞 응답이 마지막 선택을 덮지 않게, 마지막 요청만 반영한다
    const latestPick = useRef(0);
    async function pick(no) {
        const seq = ++latestPick.current;
        try {
            const r = await revisions.get(postId, no);
            if (seq === latestPick.current)
                setSelected(r);
        }
        catch (e) {
            if (seq === latestPick.current)
                setError(e instanceof ApiError ? e.message : '이 판을 불러오지 못했어요.');
        }
    }
    const latestNo = items?.[0]?.no ?? 0;
    const delta = selected ? changedLines(selected.contentMd, current.contentMd) : null;
    const same = selected != null && selected.title === current.title && selected.contentMd === current.contentMd;
    return (_jsxs(Modal, { labelledBy: "revisions-title", onClose: onClose, wide: true, children: [_jsxs("header", { className: "dialog-header", children: [_jsx("h2", { id: "revisions-title", children: "\uC218\uC815 \uC774\uB825" }), _jsx("button", { type: "button", className: "btn btn-text", "aria-label": "\uC218\uC815 \uC774\uB825 \uB2EB\uAE30", title: "\uB2EB\uAE30", onClick: onClose, children: "\u2715" })] }), _jsx("p", { className: "muted small", children: "\uBC1C\uD589\uD560 \uB54C\uB9C8\uB2E4 \uD55C \uD310\uC529 \uB0A8\uC544\uC694(\uCD5C\uADFC 50\uD310). \uD310\uC744 \uACE0\uB974\uBA74 \uC9C0\uAE08 \uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9\uACFC \uBE44\uAD50\uD574\uC694." }), error && _jsx("p", { className: "error small", role: "alert", children: error }), items == null && !error && _jsx("p", { className: "muted", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }), items?.length === 0 && _jsx("p", { className: "muted", children: "\uC544\uC9C1 \uBC1C\uD589\uD55C \uD310\uC774 \uC5C6\uC5B4\uC694." }), items && items.length > 0 && (_jsxs("div", { className: "revisions", children: [_jsx("ol", { className: "revision-list", "aria-label": "\uBC1C\uD589\uD55C \uD310", children: items.map((it) => (_jsx("li", { children: _jsxs("button", { type: "button", className: `revision-item${selected?.no === it.no ? ' active' : ''}`, "aria-current": selected?.no === it.no ? 'true' : undefined, title: `${it.no}판과 지금 내용 비교하기`, onClick: () => void pick(it.no), children: [_jsx("b", { children: revisionLabel(it, latestNo) }), _jsxs("span", { className: "muted small", children: [new Date(it.createdAt).toLocaleString('ko-KR'), " \u00B7 ", it.length.toLocaleString('ko-KR'), "\uC790"] }), _jsx("span", { className: "small revision-title", children: it.title || '제목 없음' })] }) }, it.no))) }), _jsx("div", { className: "revision-compare", children: selected && (_jsxs(_Fragment, { children: [_jsx("p", { className: "small", role: "status", children: same ? '지금 편집 중인 내용과 같아요.' : `${selected.no}판 → 지금: +${delta.added}줄 −${delta.removed}줄` }), selected.title !== current.title && (_jsxs("div", { className: "diff-title", children: [_jsx("div", { children: _jsxs("span", { className: "diff-del", children: ["\u2212 ", selected.title || '(제목 없음)'] }) }), _jsx("div", { children: _jsxs("span", { className: "diff-add", children: ["+ ", current.title || '(제목 없음)'] }) })] })), _jsx(TextDiff, { before: selected.contentMd, after: current.contentMd, beforeLabel: `${selected.no}판 · ${new Date(selected.createdAt).toLocaleString('ko-KR')}`, afterLabel: "\uC9C0\uAE08 \uD3B8\uC9D1 \uC911\uC778 \uB0B4\uC6A9" })] })) })] })), _jsxs("footer", { className: "dialog-footer revisions-footer", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: onClose, children: "\uB2EB\uAE30" }), _jsx("button", { type: "button", className: "btn btn-primary", disabled: !selected || same, title: "\uD3B8\uC9D1\uAE30 \uB0B4\uC6A9\uC744 \uC774 \uD310\uC73C\uB85C \uBC14\uAFD4\uC694. \uC9C0\uAE08 \uB0B4\uC6A9\uC740 \uC774 \uAE30\uAE30 \uBC31\uC5C5\uC5D0 \uB0A8\uACE0, \uB2E4\uC2DC \uBC1C\uD589\uD574\uC57C \uB3C5\uC790\uC5D0\uAC8C \uBCF4\uC5EC\uC694.", onClick: () => selected && onLoad(selected), children: selected ? `${selected.no}판 불러오기` : '판 불러오기' })] })] }));
}
