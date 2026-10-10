import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useState } from 'react';
import { ApiError } from '../lib/api';
import { aiErrorText, aiTagsApi, visibleSuggestions } from '../lib/aiTags';
import { MAX_TAGS } from '../lib/tags';
import { t, tNodes } from '../lib/i18n';
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
                setMessage(t('추천할 태그를 찾지 못했어요.'));
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
    return (_jsxs("div", { className: "ai-tags", children: [_jsxs("div", { className: "ai-tags-bar", children: [_jsx("button", { type: "button", className: "btn btn-outline btn-small", onClick: start, disabled: loading !== null || asking, children: t('AI 태그 추천') }), _jsx("small", { className: "muted", children: tNodes('오늘 {0}회 남음', { 0: status.remaining }) })] }), asking && (_jsxs("section", { className: "ai-consent", role: "group", "aria-labelledby": consentId, children: [_jsx("h3", { id: consentId, children: t('AI 태그 추천을 쓰기 전에 확인해 주세요') }), _jsxs("ul", { children: [_jsx("li", { children: t('글 제목과 본문 앞부분, 지금 붙인 태그가 Google Gemini(무료 등급)로 전송돼요.') }), _jsx("li", { children: t('Google이 이 내용을 서비스 개선에 쓰고, 사람이 검토할 수 있어요.') }), _jsx("li", { children: t('Gemini를 쓸 수 없을 때는 우리 서버의 AI로 처리하고, 이때는 외부로 전송되지 않아요.') }), _jsx("li", { children: t('개인정보·비밀번호·회사 기밀이 든 글에는 쓰지 마세요.') })] }), _jsx("p", { className: "muted small", children: t('동의는 설정에서 언제든 철회할 수 있어요.') }), _jsxs("div", { className: "ai-consent-actions", children: [_jsx("button", { type: "button", className: "btn btn-primary btn-small", onClick: agree, children: t('동의하고 추천받기') }), _jsx("button", { type: "button", className: "btn btn-text btn-small", onClick: () => setAsking(false), children: t('취소') })] })] })), loading === 'LOCAL' && _jsx("p", { className: "muted small", role: "status", children: t('자체 AI로 추천 중이라 조금 걸려요…') }), loading !== null && loading !== 'LOCAL' && _jsx("p", { className: "muted small", role: "status", children: t('추천 중…') }), result && shown.length > 0 && (_jsxs("div", { className: "ai-tags-result", children: [_jsx("span", { className: "muted small", children: t('추천:') }), shown.map((tag) => (_jsxs("button", { type: "button", className: "tag-chip ai-tag", onClick: () => onAdd(tag), "aria-label": t('태그 {0} 추가', { 0: tag }), children: ["+ ", tag] }, tag)))] })), result && result.tags.length > 0 && (_jsxs("p", { className: "muted small", children: [t('본문 앞부분을 보고 추천했어요 · AI 제안이에요'), result.cached ? t(' · 저장된 결과') : '', ' ', _jsx("button", { type: "button", className: "btn btn-text btn-small", onClick: () => run(true), disabled: loading !== null, children: t('다시 추천') })] })), message && _jsx("p", { className: "small", role: "alert", children: message })] }));
}
