import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { fullDate, relativeDate } from '../lib/format';
import { Link } from '../lib/router';
import { claudeCodeCommand, TOKEN_EXPIRY_DAYS, TOKEN_NAME_MAX, tokensApi, } from '../lib/mcp';
import { CopyCode } from './CopyCode';
/**
 * 설정 › AI 연결 (052): MCP용 개인 접근 토큰을 만들고 폐기한다.
 * 원문은 만든 직후 이 화면에서 한 번만 보여 준다. 다시 볼 수 없으니 새로 만들게 안내한다.
 */
export function AiConnectSection() {
    const [tokens, setTokens] = useState(null);
    const [name, setName] = useState('Claude Code');
    const [scope, setScope] = useState('WRITE');
    const [days, setDays] = useState(90);
    const [issued, setIssued] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    useEffect(() => { tokensApi.list().then(setTokens).catch(() => setTokens([])); }, []);
    // 안내 페이지의 "토큰 만들기"(/settings#ai)로 오면 이 항목으로 내린다
    useEffect(() => { if (tokens && location.hash === '#ai')
        document.getElementById('ai')?.scrollIntoView(); }, [tokens]);
    const create = async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage(null);
        try {
            const t = await tokensApi.create(name.trim(), scope, days);
            setIssued(t);
            setTokens((list) => [t.token, ...(list ?? [])]);
        }
        catch (err) {
            setMessage({ ok: false, text: err instanceof ApiError ? (err.errors[0]?.message ?? err.message) : '토큰을 만들지 못했어요. 다시 시도해 주세요.' });
        }
        finally {
            setBusy(false);
        }
    };
    const revoke = async (t) => {
        if (!confirm(`'${t.name}' ${t.oauth ? '연결을 끊을까요' : '토큰을 폐기할까요'}? 이 토큰으로 연결한 AI는 바로 devlog를 쓸 수 없게 돼요.`))
            return;
        setBusy(true);
        setMessage(null);
        try {
            await tokensApi.revoke(t.id);
            setTokens((list) => (list ?? []).filter((x) => x.id !== t.id));
            if (issued?.token.id === t.id)
                setIssued(null);
            setMessage({ ok: true, text: '폐기했어요.' });
        }
        catch {
            setMessage({ ok: false, text: '폐기하지 못했어요. 다시 시도해 주세요.' });
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("section", { className: "settings-section ai-connect", id: "ai", children: [_jsx("h2", { children: "AI \uC5F0\uACB0" }), _jsxs("p", { className: "muted small", children: ["Claude Code\u00B7Cursor\u00B7Codex \uAC19\uC740 AI \uB3C4\uAD6C\uC5D0 \uD1A0\uD070\uC73C\uB85C devlog\uB97C \uC5F0\uACB0\uD558\uBA74 \"\uAC1C\uBC1C \uC77C\uC9C0 \uC368 \uC918\" \uD55C\uB9C8\uB514\uB85C \uC784\uC2DC\uAE00\uC774 \uB9CC\uB4E4\uC5B4\uC838\uC694. ChatGPT\uCC98\uB7FC \uB85C\uADF8\uC778\uC73C\uB85C \uC5F0\uACB0\uD55C \uC571\uB3C4 \uC5EC\uAE30\uC5D0 \uBCF4\uC5EC\uC694. \uBC1C\uD589\uC740 \uC5B8\uC81C\uB098 \uB0B4\uAC00 \uD574\uC694. ", _jsx(Link, { to: "/mcp", children: "\uC5F0\uACB0 \uBC29\uBC95 \uC790\uC138\uD788 \uBCF4\uAE30" })] }), issued && (_jsxs("div", { className: "banner ai-connect-issued", role: "status", children: [_jsxs("p", { children: [_jsxs("b", { children: ["'", issued.token.name, "' \uD1A0\uD070\uC744 \uB9CC\uB4E4\uC5C8\uC5B4\uC694."] }), " \uC774 \uD654\uBA74\uC744 \uBC97\uC5B4\uB098\uBA74 \uB2E4\uC2DC \uBCFC \uC218 \uC5C6\uC73C\uB2C8 \uC9C0\uAE08 \uBCF5\uC0AC\uD574 \uB450\uC138\uC694."] }), _jsx(CopyCode, { label: "\uC0C8 \uD1A0\uD070", code: issued.secret }), _jsx("p", { className: "small", children: "Claude Code\uB77C\uBA74 \uD130\uBBF8\uB110\uC5D0 \uC774 \uBA85\uB839\uC744 \uBD99\uC5EC \uB123\uC73C\uBA74 \uC5F0\uACB0\uB3FC\uC694." }), _jsx(CopyCode, { label: "Claude Code \uC5F0\uACB0 \uBA85\uB839", code: claudeCodeCommand(window.location.origin, issued.secret) }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setIssued(null), children: "\uB2E4 \uBCF5\uC0AC\uD588\uC5B4\uC694" })] })), _jsxs("form", { className: "ai-connect-form", onSubmit: create, children: [_jsxs("label", { children: [_jsx("span", { children: "\uC774\uB984" }), _jsx("input", { value: name, maxLength: TOKEN_NAME_MAX, required: true, onChange: (e) => setName(e.target.value), placeholder: "\uC608: \uD68C\uC0AC \uB178\uD2B8\uBD81 Claude Code" })] }), _jsxs("label", { children: [_jsx("span", { children: "\uAD8C\uD55C" }), _jsxs("select", { value: scope, onChange: (e) => setScope(e.target.value), children: [_jsx("option", { value: "WRITE", children: "\uC784\uC2DC\uAE00 \uC4F0\uAE30 + \uC77D\uAE30" }), _jsx("option", { value: "READ", children: "\uC77D\uAE30\uB9CC" })] })] }), _jsxs("label", { children: [_jsx("span", { children: "\uB9CC\uB8CC" }), _jsx("select", { value: days, onChange: (e) => setDays(Number(e.target.value)), children: TOKEN_EXPIRY_DAYS.map((d) => _jsx("option", { value: d, children: d === 365 ? '1년' : `${d}일` }, d)) })] }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: busy || !name.trim(), children: "\uD1A0\uD070 \uB9CC\uB4E4\uAE30" })] }), tokens && tokens.length > 0 && (_jsx("ul", { className: "token-list", children: tokens.map((t) => (_jsxs("li", { className: "token-row", children: [_jsxs("span", { className: "token-who", children: [_jsx("b", { children: t.name }), " ", t.oauth ? _jsx("span", { className: "token-kind", children: "\uB85C\uADF8\uC778 \uC5F0\uACB0" }) : _jsxs("code", { children: [t.prefix, "\u2026"] }), _jsxs("span", { className: "muted small", children: [t.scope === 'WRITE' ? '쓰기' : '읽기', ' · ', t.expired ? _jsx("span", { className: "error", children: "\uB9CC\uB8CC\uB428" }) : t.expiresAt ? `${fullDate(t.expiresAt)}까지` : '만료 없음', ' · ', t.lastUsedAt ? `${relativeDate(t.lastUsedAt)} 사용` : '아직 안 씀'] })] }), _jsx("button", { type: "button", className: "btn btn-text danger", disabled: busy, onClick: () => revoke(t), children: t.oauth ? '연결 끊기' : '폐기' })] }, t.id))) })), message && _jsx("p", { className: message.ok ? 'ok' : 'error', role: "status", children: message.text })] }));
}
