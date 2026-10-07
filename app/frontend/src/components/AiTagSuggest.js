import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useState } from 'react';
import { ApiError } from '../lib/api';
import { aiErrorText, aiTagsApi, visibleSuggestions } from '../lib/aiTags';
import { MAX_TAGS } from '../lib/tags';
/**
 * 발행 설정 창의 [AI 태그 추천] (spec 018). 처음에는 외부 전송 동의를 받고, 제안은 눌러야만 태그에 들어간다.
 * 기능이 꺼져 있거나 상태를 모르면 아무것도 그리지 않는다. 실패해도 발행과는 관계없다.
 */
export function AiTagSuggest({ postId, title, content, tags, onAdd }) {
    const [status, setStatus] = useState(null);
    const [asking, setAsking] = useState(false);
    const [loading, setLoading] = useState(null);
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState(null);
    const consentId = useId();
    useEffect(() => {
        let alive = true;
        aiTagsApi.status().then((s) => { if (alive)
            setStatus(s); }).catch(() => { });
        return () => { alive = false; };
    }, []);
    if (!status?.enabled)
        return null;
    const run = async (again) => {
        setMessage(null);
        setLoading(status.provider ?? 'unknown');
        try {
            const r = await aiTagsApi.suggest(postId, { title, content, tags, again });
            setResult({ tags: r.tags, cached: r.cached });
            setStatus((s) => s && { ...s, remaining: r.remaining });
            if (r.tags.length === 0)
                setMessage('추천할 태그를 찾지 못했어요.');
        }
        catch (e) {
            if (e instanceof ApiError && e.code === 'AI_CONSENT_REQUIRED') {
                setStatus((s) => s && { ...s, agreed: false });
                setAsking(true);
            }
            else {
                setMessage(aiErrorText(e));
            }
        }
        finally {
            setLoading(null);
            // 공급자 전환(한도·쉼)을 다음 안내에 반영한다
            aiTagsApi.status().then(setStatus).catch(() => { });
        }
    };
    const start = () => {
        if (!status.agreed)
            return setAsking(true);
        void run(false);
    };
    const agree = async () => {
        try {
            await aiTagsApi.agree();
            setStatus((s) => s && { ...s, agreed: true });
            setAsking(false);
            void run(false);
        }
        catch (e) {
            setMessage(aiErrorText(e));
        }
    };
    const shown = result ? visibleSuggestions(result.tags, tags, MAX_TAGS) : [];
    return (_jsxs("div", { className: "ai-tags", children: [_jsxs("div", { className: "ai-tags-bar", children: [_jsx("button", { type: "button", className: "btn btn-outline btn-small", onClick: start, disabled: loading !== null || asking, children: "AI \uD0DC\uADF8 \uCD94\uCC9C" }), _jsxs("small", { className: "muted", children: ["\uC624\uB298 ", status.remaining, "\uD68C \uB0A8\uC74C"] })] }), asking && (_jsxs("section", { className: "ai-consent", role: "group", "aria-labelledby": consentId, children: [_jsx("h3", { id: consentId, children: "AI \uD0DC\uADF8 \uCD94\uCC9C\uC744 \uC4F0\uAE30 \uC804\uC5D0 \uD655\uC778\uD574 \uC8FC\uC138\uC694" }), _jsxs("ul", { children: [_jsx("li", { children: "\uAE00 \uC81C\uBAA9\uACFC \uBCF8\uBB38 \uC55E\uBD80\uBD84, \uC9C0\uAE08 \uBD99\uC778 \uD0DC\uADF8\uAC00 Google Gemini(\uBB34\uB8CC \uB4F1\uAE09)\uB85C \uC804\uC1A1\uB3FC\uC694." }), _jsx("li", { children: "Google\uC774 \uC774 \uB0B4\uC6A9\uC744 \uC11C\uBE44\uC2A4 \uAC1C\uC120\uC5D0 \uC4F0\uACE0, \uC0AC\uB78C\uC774 \uAC80\uD1A0\uD560 \uC218 \uC788\uC5B4\uC694." }), _jsx("li", { children: "Gemini\uB97C \uC4F8 \uC218 \uC5C6\uC744 \uB54C\uB294 \uC6B0\uB9AC \uC11C\uBC84\uC758 AI\uB85C \uCC98\uB9AC\uD558\uACE0, \uC774\uB54C\uB294 \uC678\uBD80\uB85C \uC804\uC1A1\uB418\uC9C0 \uC54A\uC544\uC694." }), _jsx("li", { children: "\uAC1C\uC778\uC815\uBCF4\u00B7\uBE44\uBC00\uBC88\uD638\u00B7\uD68C\uC0AC \uAE30\uBC00\uC774 \uB4E0 \uAE00\uC5D0\uB294 \uC4F0\uC9C0 \uB9C8\uC138\uC694." })] }), _jsx("p", { className: "muted small", children: "\uB3D9\uC758\uB294 \uC124\uC815\uC5D0\uC11C \uC5B8\uC81C\uB4E0 \uCCA0\uD68C\uD560 \uC218 \uC788\uC5B4\uC694." }), _jsxs("div", { className: "ai-consent-actions", children: [_jsx("button", { type: "button", className: "btn btn-primary btn-small", onClick: agree, children: "\uB3D9\uC758\uD558\uACE0 \uCD94\uCC9C\uBC1B\uAE30" }), _jsx("button", { type: "button", className: "btn btn-text btn-small", onClick: () => setAsking(false), children: "\uCDE8\uC18C" })] })] })), loading === 'LOCAL' && _jsx("p", { className: "muted small", role: "status", children: "\uC790\uCCB4 AI\uB85C \uCD94\uCC9C \uC911\uC774\uB77C \uC870\uAE08 \uAC78\uB824\uC694\u2026" }), loading !== null && loading !== 'LOCAL' && _jsx("p", { className: "muted small", role: "status", children: "\uCD94\uCC9C \uC911\u2026" }), result && shown.length > 0 && (_jsxs("div", { className: "ai-tags-result", children: [_jsx("span", { className: "muted small", children: "\uCD94\uCC9C:" }), shown.map((t) => (_jsxs("button", { type: "button", className: "tag-chip ai-tag", onClick: () => onAdd(t), "aria-label": `태그 ${t} 추가`, children: ["+ ", t] }, t)))] })), result && result.tags.length > 0 && (_jsxs("p", { className: "muted small", children: ["\uBCF8\uBB38 \uC55E\uBD80\uBD84\uC744 \uBCF4\uACE0 \uCD94\uCC9C\uD588\uC5B4\uC694 \u00B7 AI \uC81C\uC548\uC774\uC5D0\uC694", result.cached ? ' · 저장된 결과' : '', ' ', _jsx("button", { type: "button", className: "btn btn-text btn-small", onClick: () => run(true), disabled: loading !== null, children: "\uB2E4\uC2DC \uCD94\uCC9C" })] })), message && _jsx("p", { className: "small", role: "alert", children: message })] }));
}
