import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { oauthApi, oauthParams } from '../lib/mcp';
import { Link } from '../lib/router';
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
    useEffect(() => { document.title = 'AI 앱 연결 - devlog'; }, []);
    useEffect(() => {
        oauthApi.view(window.location.search).then(setView)
            .catch((e) => setError(e instanceof ApiError ? e.message : '연결 요청을 확인하지 못했어요.'));
    }, []);
    const decide = async (approve) => {
        setBusy(true);
        setError(null);
        try {
            const { redirect } = await api('/api/oauth/authorize', { method: 'POST', body: { ...params, approve } });
            window.location.assign(redirect);
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : '처리하지 못했어요. 다시 시도해 주세요.');
            setBusy(false);
        }
    };
    return (_jsxs("main", { className: "container narrow oauth-page", children: [_jsx("h1", { className: "page-title", children: "AI \uC571 \uC5F0\uACB0" }), error && _jsx("p", { className: "error", role: "alert", children: error }), !view && !error && _jsx("p", { className: "muted", children: "\uD655\uC778\uD558\uB294 \uC911\u2026" }), view && (_jsxs("section", { className: "oauth-card", children: [_jsx("p", { className: "oauth-unverified", role: "note", children: "devlog\uAC00 \uD655\uC778\uD558\uC9C0 \uC54A\uC740 \uC571\uC774\uC5D0\uC694. \uC774\uB984\uC740 \uC571\uC774 \uC2A4\uC2A4\uB85C \uC815\uD55C \uAC83\uC774\uB77C \uC544\uB798 \uC8FC\uC18C\uB85C \uC9C4\uC9DC \uC571\uC778\uC9C0 \uD655\uC778\uD574 \uC8FC\uC138\uC694." }), _jsxs("p", { className: "oauth-lead", children: [_jsx("b", { children: view.clientName }), "\uC774(\uAC00) ", me?.member?.nickname ? _jsxs(_Fragment, { children: [_jsx("b", { children: me.member.nickname }), "\uB2D8\uC758"] }) : '내', " devlog\uC5D0 \uC5F0\uACB0\uD558\uB824\uACE0 \uD574\uC694."] }), _jsxs("ul", { className: "oauth-scope", children: [_jsx("li", { children: "\uB0B4 \uAE00\uACFC \uACF5\uAC1C \uAE00 \uC77D\uAE30 (\uC6F9\uC5D0\uC11C \uBCFC \uC218 \uC788\uB294 \uAE00\uB9CC)" }), view.scope === 'WRITE' && _jsx("li", { children: "\uC784\uC2DC\uAE00 \uB9CC\uB4E4\uAE30\u00B7\uACE0\uCE58\uAE30, \"\uBC1C\uD589 \uB300\uAE30\" \uD45C\uC2DC" }), _jsx("li", { className: "muted", children: "\uBC1C\uD589\u00B7\uC0AD\uC81C\uB294 \uB0B4\uAC00 \uC124\uC815 \u203A AI \uC5F0\uACB0\uC5D0\uC11C \uD5C8\uC6A9\uD588\uC744 \uB54C\uB9CC \uD560 \uC218 \uC788\uC5B4\uC694(\uAE30\uBCF8\uC740 \uAEBC\uC9D0). \uACF5\uAC1C \uBC94\uC704\uB9CC \uBC14\uAFB8\uB294 \uC77C\uC740 \uD560 \uC218 \uC5C6\uC5B4\uC694." })] }), _jsxs("div", { className: "oauth-host", children: [_jsx("span", { className: "muted small", children: "\uD5C8\uC6A9\uD558\uBA74 \uC774 \uC8FC\uC18C\uB85C \uB3CC\uC544\uAC00\uC694" }), _jsx("strong", { children: view.redirectHost })] }), _jsx("p", { className: "muted small", children: "\uC124\uC815 \u203A AI \uC5F0\uACB0\uC5D0\uC11C \uC5B8\uC81C\uB4E0 \uC5F0\uACB0\uC744 \uB04A\uC744 \uC218 \uC788\uC5B4\uC694." }), _jsxs("div", { className: "oauth-actions", children: [_jsx("button", { type: "button", className: "btn btn-primary btn-lg", disabled: busy, onClick: () => decide(true), children: "\uD5C8\uC6A9" }), _jsx("button", { type: "button", className: "btn btn-outline btn-lg", disabled: busy, onClick: () => decide(false), children: "\uAC70\uBD80" })] }), _jsxs("p", { className: "muted small", children: ["\uCC98\uC74C \uBCF4\uB294 \uC571\uC774\uAC70\uB098 \uC9C1\uC811 \uC5F0\uACB0\uC744 \uC2DC\uC791\uD558\uC9C0 \uC54A\uC558\uB2E4\uBA74 \uAC70\uBD80\uD574 \uC8FC\uC138\uC694. ", _jsx(Link, { to: "/mcp", children: "AI \uC5F0\uACB0 \uC548\uB0B4" })] })] }))] }));
}
