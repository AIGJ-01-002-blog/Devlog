import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';
import { revisionLabel, revisions } from '../lib/revisions';
import { Modal } from './Modal';
import { changedLines, TextDiff } from './TextDiff';
import { clock, fullDate } from '../lib/format';
import { t, tNodes } from '../lib/i18n';
/**
 * 글 수정 이력 (058). Crowfoot의 "버전 기록"처럼 발행한 판을 고르고 지금 편집 중인 내용과 비교한다.
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
            .catch((e) => setError(e instanceof ApiError ? e.message : t('수정 이력을 불러오지 못했어요.')));
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
                setError(e instanceof ApiError ? e.message : t('이 판을 불러오지 못했어요.'));
        }
    }
    const latestNo = items?.[0]?.no ?? 0;
    const delta = selected ? changedLines(selected.contentMd, current.contentMd) : null;
    const same = selected != null && selected.title === current.title && selected.contentMd === current.contentMd;
    return (_jsxs(Modal, { labelledBy: "revisions-title", onClose: onClose, wide: true, children: [_jsxs("header", { className: "dialog-header", children: [_jsx("h2", { id: "revisions-title", children: t('수정 이력') }), _jsx("button", { type: "button", className: "btn btn-text", "aria-label": t('수정 이력 닫기'), "data-tip": t('닫기'), onClick: onClose, children: "\u2715" })] }), _jsx("p", { className: "muted small", children: t('발행할 때마다 한 판씩 남아요(최근 50판). 판을 고르면 지금 편집 중인 내용과 비교해요.') }), error && _jsx("p", { className: "error small", role: "alert", children: error }), items == null && !error && _jsx("p", { className: "muted", children: t('불러오는 중…') }), items?.length === 0 && _jsx("p", { className: "muted", children: t('아직 발행한 판이 없어요.') }), items && items.length > 0 && (_jsxs("div", { className: "revisions", children: [_jsx("ol", { className: "revision-list", "aria-label": t('발행한 판'), children: items.map((it) => (_jsx("li", { children: _jsxs("button", { type: "button", className: `revision-item${selected?.no === it.no ? ' active' : ''}`, "aria-current": selected?.no === it.no ? 'true' : undefined, "data-tip": t('{0}판과 지금 내용 비교하기', { 0: it.no }), onClick: () => void pick(it.no), children: [_jsx("b", { children: revisionLabel(it, latestNo) }), _jsx("span", { className: "muted small", children: tNodes('{0} {1} · {2}자', { 0: fullDate(it.createdAt), 1: clock(it.createdAt), 2: it.length.toLocaleString('ko-KR') }) }), _jsx("span", { className: "small revision-title", children: it.title || t('제목 없음') })] }) }, it.no))) }), _jsx("div", { className: "revision-compare", children: selected && (_jsxs(_Fragment, { children: [_jsx("p", { className: "small", role: "status", children: same ? t('지금 편집 중인 내용과 같아요.') : t('{0}판 → 지금: +{1}줄 −{2}줄', { 0: selected.no, 1: delta.added, 2: delta.removed }) }), selected.title !== current.title && (_jsxs("div", { className: "diff-title", children: [_jsx("div", { children: _jsxs("span", { className: "diff-del", children: ["\u2212 ", selected.title || t('(제목 없음)')] }) }), _jsx("div", { children: _jsxs("span", { className: "diff-add", children: ["+ ", current.title || t('(제목 없음)')] }) })] })), _jsx(TextDiff, { before: selected.contentMd, after: current.contentMd, beforeLabel: t('{0}판 · {1} {2}', { 0: selected.no, 1: fullDate(selected.createdAt), 2: clock(selected.createdAt) }), afterLabel: t('지금 편집 중인 내용') })] })) })] })), _jsxs("footer", { className: "dialog-footer revisions-footer", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: onClose, children: t('닫기') }), _jsx("button", { type: "button", className: "btn btn-primary", disabled: !selected || same, "data-tip": t('편집기 내용을 이 판으로 바꿔요. 지금 내용은 이 기기 백업에 남고, 다시 발행해야 독자에게 보여요.'), onClick: () => selected && onLoad(selected), children: selected ? t('{0}판 불러오기', { 0: selected.no }) : t('판 불러오기') })] })] }));
}
