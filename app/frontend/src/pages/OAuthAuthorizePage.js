import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { oauthApi, oauthParams } from '../lib/mcp';
import { Link } from '../lib/router';
import { t, tNodes } from '../lib/i18n';
/**
 * AI 앱 연결 동의 (052). ChatGPT 같은 앱이 OAuth로 devlog에 연결할 때 이 화면으로 보낸다.
 * [허용]을 누르면 앱이 내 이름으로 MCP 도구를 쓸 수 있다. 발행은 여전히 내가 화면에서 한다.
 */
export function OAuthAuthorizePage() {
    const { me } = useAuth();
    const [params] = useState(() => oauthParams(window.location.search));
    const [view, setView] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => { document.title = t('AI 앱 연결 - devlog'); }, []);
    useEffect(() => {
        oauthApi.view(window.location.search).then(setView)
            .catch((e) => setError(e instanceof ApiError ? e.message : t('연결 요청을 확인하지 못했어요.')));
    }, []);
    const decide = async (approve) => {
        setBusy(true);
        setError(null);
        try {
            const { redirect } = await api('/api/oauth/authorize', { method: 'POST', body: { ...params, approve } });
            window.location.assign(redirect);
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : t('처리하지 못했어요. 다시 시도해 주세요.'));
            setBusy(false);
        }
    };
    return (_jsxs("main", { className: "container narrow oauth-page", children: [_jsx("h1", { className: "page-title", children: t('AI 앱 연결') }), error && _jsx("p", { className: "error", role: "alert", children: error }), !view && !error && _jsx("p", { className: "muted", children: t('확인하는 중…') }), view && (_jsxs("section", { className: "oauth-card", children: [_jsx("p", { className: "oauth-unverified", role: "note", children: t('devlog가 확인하지 않은 앱이에요. 이름은 앱이 스스로 정한 것이라 아래 주소로 진짜 앱인지 확인해 주세요.') }), _jsx("p", { className: "oauth-lead", children: me?.member?.nickname
                            ? tNodes('{0}이(가) {1}님의 devlog에 연결하려고 해요.', { 0: _jsx("b", { children: view.clientName }), 1: _jsx("b", { children: me.member.nickname }) })
                            : tNodes('{0}이(가) 내 devlog에 연결하려고 해요.', { 0: _jsx("b", { children: view.clientName }) }) }), _jsxs("ul", { className: "oauth-scope", children: [_jsx("li", { children: t('내 글과 공개 글 읽기 (웹에서 볼 수 있는 글만)') }), view.scope === 'WRITE' && _jsx("li", { children: t('임시글 만들기·고치기, "발행 대기" 표시') }), _jsx("li", { className: "muted", children: t('발행·삭제는 내가 설정 › AI 연결에서 허용했을 때만 할 수 있어요(기본은 꺼짐). 공개 범위만 바꾸는 일은 할 수 없어요.') })] }), _jsxs("div", { className: "oauth-host", children: [_jsx("span", { className: "muted small", children: t('허용하면 이 주소로 돌아가요') }), _jsx("strong", { children: view.redirectHost })] }), _jsx("p", { className: "muted small", children: t('설정 › AI 연결에서 언제든 연결을 끊을 수 있어요.') }), _jsxs("div", { className: "oauth-actions", children: [_jsx("button", { type: "button", className: "btn btn-primary btn-lg", disabled: busy, onClick: () => decide(true), children: t('허용') }), _jsx("button", { type: "button", className: "btn btn-outline btn-lg", disabled: busy, onClick: () => decide(false), children: t('거부') })] }), _jsx("p", { className: "muted small", children: tNodes('처음 보는 앱이거나 직접 연결을 시작하지 않았다면 거부해 주세요. {0}', { 0: _jsx(Link, { to: "/mcp", children: t('AI 연결 안내') }) }) })] }))] }));
}
