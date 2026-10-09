import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { relativeDate } from '../lib/format';
import { aiProposalsApi } from '../lib/mcp';
import { navigate } from '../lib/router';
/**
 * 내 글 관리 › 임시글 탭 위의 "AI가 제안한 글" (061). 연결한 AI가 한 주제를 마쳤을 때 남긴 제목·쓸 범위를 보여 준다.
 * [임시글로 만들기]는 범위를 뼈대로 한 임시글을 만들어 편집 화면으로 간다. [넘기기]는 제안을 닫는다. 제안이 없으면 아무것도 그리지 않는다.
 */
export function AiProposals() {
    const [items, setItems] = useState([]);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const load = () => {
        setLoadFailed(false);
        aiProposalsApi.list().then(setItems).catch(() => setLoadFailed(true));
    };
    useEffect(load, []);
    // 알림의 링크(#ai-proposals)로 오면 목록을 불러온 뒤 이 항목으로 내린다. 처음 이동 때는 아직 그려지지 않았다
    const hasItems = items.length > 0;
    useEffect(() => {
        if (hasItems && location.hash === '#ai-proposals')
            document.getElementById('ai-proposals')?.scrollIntoView();
    }, [hasItems]);
    if (loadFailed) {
        return (_jsx("section", { id: "ai-proposals", className: "ai-proposals", "aria-label": "AI\uAC00 \uC81C\uC548\uD55C \uAE00", children: _jsxs("p", { className: "error", role: "status", children: ["AI\uAC00 \uC81C\uC548\uD55C \uAE00\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694. ", _jsx("button", { type: "button", className: "btn btn-text", title: "\uC81C\uC548 \uBAA9\uB85D\uC744 \uB2E4\uC2DC \uBD88\uB7EC\uC640\uC694", onClick: load, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] }) }));
    }
    if (items.length === 0)
        return null;
    const run = async (p, action) => {
        setBusy(p.id);
        setError(null);
        try {
            if (action === 'draft') {
                const { postId } = await aiProposalsApi.draft(p.id);
                navigate(`/write/${postId}`);
                return;
            }
            if (!confirm('이 제안을 넘길까요? AI가 다시 묻지 않아요.'))
                return;
            await aiProposalsApi.dismiss(p.id);
            setItems((list) => list.filter((i) => i.id !== p.id));
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : '처리하지 못했어요. 다시 시도해 주세요.');
        }
        finally {
            setBusy(null);
        }
    };
    return (_jsxs("section", { id: "ai-proposals", className: "ai-proposals", "aria-labelledby": "ai-proposals-title", children: [_jsxs("h2", { id: "ai-proposals-title", children: ["AI\uAC00 \uC81C\uC548\uD55C \uAE00 ", _jsx("span", { className: "muted", children: items.length })] }), _jsx("p", { className: "muted small", children: "\uC5F0\uACB0\uD55C AI\uAC00 \uD55C \uC8FC\uC81C\uB97C \uB9C8\uCCE4\uC744 \uB54C \uAE00\uB85C \uB0A8\uAE30\uBA74 \uC88B\uACA0\uB2E4\uACE0 \uC81C\uC548\uD55C \uAC83\uB4E4\uC774\uC5D0\uC694. AI\uC5D0\uAC8C \"\uC81C\uC548\uD55C \uAE00 \uC368 \uC918\"\uB77C\uACE0 \uD574\uB3C4 \uB3FC\uC694." }), _jsx("ul", { children: items.map((p) => (_jsxs("li", { className: "ai-proposal", children: [_jsxs("div", { className: "ai-proposal-head", children: [_jsx("b", { className: "ai-proposal-title", children: p.title }), _jsx("span", { className: "muted small", children: relativeDate(p.createdAt) })] }), _jsx("p", { className: "ai-proposal-scope", children: p.scope }), p.tags.length > 0 && _jsx("p", { className: "muted small", children: p.tags.map((t) => `#${t}`).join(' ') }), _jsxs("div", { className: "ai-proposal-actions", children: [_jsx("button", { type: "button", className: "btn btn-primary btn-small", disabled: busy !== null, title: "\uC81C\uBAA9\uACFC \uC4F8 \uBC94\uC704\uB85C \uC784\uC2DC\uAE00\uC744 \uB9CC\uB4E4\uACE0 \uD3B8\uC9D1 \uD654\uBA74\uC744 \uC5F4\uC5B4\uC694", onClick: () => run(p, 'draft'), children: "\uC784\uC2DC\uAE00\uB85C \uB9CC\uB4E4\uAE30" }), _jsx("button", { type: "button", className: "btn btn-text", disabled: busy !== null, title: "\uC774 \uC81C\uC548\uC744 \uBAA9\uB85D\uC5D0\uC11C \uCE58\uC6CC\uC694. AI\uB3C4 \uB2E4\uC2DC \uBB3B\uC9C0 \uC54A\uC544\uC694", onClick: () => run(p, 'dismiss'), children: "\uB118\uAE30\uAE30" })] })] }, p.id))) }), error && _jsx("p", { className: "error", role: "status", children: error })] }));
}
