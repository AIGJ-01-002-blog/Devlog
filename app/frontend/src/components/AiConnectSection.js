import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { fullDate, relativeDate } from '../lib/format';
import { Link } from '../lib/router';
import { aiDiaryApi, aiPublishApi, diaryHourLabel, claudeCodeCommand, TOKEN_EXPIRY_DAYS, TOKEN_NAME_MAX, tokensApi, } from '../lib/mcp';
import { CopyCode } from './CopyCode';
import { t, tNodes } from '../lib/i18n';
/**
 * 설정 › AI 연결 (052): MCP용 개인 접근 토큰을 만들고 폐기한다.
 * 원문은 만든 직후 이 화면에서 한 번만 보여 준다. 다시 볼 수 없으니 새로 만들게 안내한다.
 * 아래의 "AI가 발행·삭제하도록 허용"(053)은 기본 꺼짐이고, 켤 때 한 번 더 묻는다.
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
            const created = await tokensApi.create(name.trim(), scope, days);
            setIssued(created);
            setTokens((list) => [created.token, ...(list ?? [])]);
        }
        catch (err) {
            setMessage({ ok: false, text: err instanceof ApiError ? (err.errors[0]?.message ?? err.message) : t('토큰을 만들지 못했어요. 다시 시도해 주세요.') });
        }
        finally {
            setBusy(false);
        }
    };
    const revoke = async (tok) => {
        const ask = tok.oauth
            ? t('\'{0}\' 연결을 끊을까요? 이 토큰으로 연결한 AI는 바로 devlog를 쓸 수 없게 돼요.', { 0: tok.name })
            : t('\'{0}\' 토큰을 폐기할까요? 이 토큰으로 연결한 AI는 바로 devlog를 쓸 수 없게 돼요.', { 0: tok.name });
        if (!confirm(ask))
            return;
        setBusy(true);
        setMessage(null);
        try {
            await tokensApi.revoke(tok.id);
            setTokens((list) => (list ?? []).filter((x) => x.id !== tok.id));
            if (issued?.token.id === tok.id)
                setIssued(null);
            setMessage({ ok: true, text: t('폐기했어요.') });
        }
        catch {
            setMessage({ ok: false, text: t('폐기하지 못했어요. 다시 시도해 주세요.') });
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("section", { className: "settings-section ai-connect", id: "ai", children: [_jsx("h2", { children: t('AI 연결') }), _jsx("p", { className: "muted small", children: tNodes('Claude Code·Cursor·Codex 같은 AI 도구에 토큰으로 devlog를 연결하면 "개발 일지 써 줘" 한마디로 임시글이 만들어져요. ChatGPT처럼 로그인으로 연결한 앱도 여기에 보여요. 발행은 기본으로 내가 해요. {0}', { 0: _jsx(Link, { to: "/mcp", children: t('연결 방법 자세히 보기') }) }) }), issued && (_jsxs("div", { className: "banner ai-connect-issued", role: "status", children: [_jsx("p", { children: tNodes('{0} 이 화면을 벗어나면 다시 볼 수 없으니 지금 복사해 두세요.', { 0: _jsx("b", { children: t('\'{0}\' 토큰을 만들었어요.', { 0: issued.token.name }) }) }) }), _jsx(CopyCode, { label: t('새 토큰'), code: issued.secret }), _jsx("p", { className: "small", children: t('Claude Code라면 터미널에 이 명령을 붙여 넣으면 연결돼요.') }), _jsx(CopyCode, { label: t('Claude Code 연결 명령'), code: claudeCodeCommand(window.location.origin, issued.secret) }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setIssued(null), children: t('다 복사했어요') })] })), _jsxs("form", { className: "ai-connect-form", onSubmit: create, children: [_jsxs("label", { children: [_jsx("span", { children: t('이름') }), _jsx("input", { name: "tokenName", autoComplete: "off", value: name, maxLength: TOKEN_NAME_MAX, required: true, onChange: (e) => setName(e.target.value), placeholder: t('예: 회사 노트북 Claude Code') })] }), _jsxs("label", { children: [_jsx("span", { children: t('권한') }), _jsxs("select", { value: scope, onChange: (e) => setScope(e.target.value), children: [_jsx("option", { value: "WRITE", children: t('쓰기 + 읽기') }), _jsx("option", { value: "READ", children: t('읽기만') })] })] }), _jsxs("label", { children: [_jsx("span", { children: t('만료') }), _jsx("select", { value: days, onChange: (e) => setDays(Number(e.target.value)), children: TOKEN_EXPIRY_DAYS.map((d) => _jsx("option", { value: d, children: d === 365 ? t('1년') : t('{0}일', { 0: d }) }, d)) })] }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: busy || !name.trim(), children: t('토큰 만들기') })] }), tokens && tokens.length > 0 && (_jsx("ul", { className: "token-list", children: tokens.map((tok) => (_jsxs("li", { className: "token-row", children: [_jsxs("span", { className: "token-who", children: [_jsx("b", { children: tok.name }), " ", tok.oauth ? _jsx("span", { className: "token-kind", children: t('로그인 연결') }) : _jsxs("code", { children: [tok.prefix, "\u2026"] }), _jsxs("span", { className: "muted small", children: [tok.scope === 'WRITE' ? t('쓰기') : t('읽기'), ' · ', tok.expired ? _jsx("span", { className: "error", children: t('만료됨') }) : tok.expiresAt ? t('{0}까지', { 0: fullDate(tok.expiresAt) }) : t('만료 없음'), ' · ', tok.lastUsedAt ? t('{0} 사용', { 0: relativeDate(tok.lastUsedAt) }) : t('아직 안 씀')] })] }), _jsx("button", { type: "button", className: "btn btn-text danger", disabled: busy, onClick: () => revoke(tok), children: tok.oauth ? t('연결 끊기') : t('폐기') })] }, tok.id))) })), _jsx("div", { role: "status", children: message && _jsx("p", { className: message.ok ? 'ok' : 'error', children: message.text }) }), _jsx(AiPublishToggle, {}), _jsx(AiDiaryToggle, {})] }));
}
const AI_PUBLISH_WARNING = t('켜면 연결한 AI가 글을 바로 발행하거나 삭제할 수 있어요. 삭제는 웹에서 지울 때와 같아요.');
/**
 * "AI가 발행·삭제하도록 허용" (053). 기본은 꺼짐. 켜면 쓰기 권한으로 연결한 AI에 publish_post·delete_post가 열린다.
 * 이 설정은 로그인한 이 화면에서만 바꿀 수 있어서 AI가 스스로 켤 수 없다.
 */
function AiPublishToggle() {
    const [allowed, setAllowed] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => { aiPublishApi.get().then((s) => setAllowed(s.allowed)).catch(() => setAllowed(null)); }, []);
    const change = async (on) => {
        if (on && !confirm(t('AI가 발행·삭제하도록 허용할까요?\n쓰기 권한으로 연결한 AI가 내 확인 없이 글을 바로 발행하거나 휴지통으로 옮길 수 있어요. 언제든 다시 끌 수 있어요.')))
            return;
        setBusy(true);
        setError(null);
        try {
            setAllowed((await aiPublishApi.set(on)).allowed);
        }
        catch {
            setError(t('설정을 바꾸지 못했어요. 다시 시도해 주세요.'));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: "ai-publish", children: [_jsx("h3", { children: t('AI 발행·삭제') }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: allowed === true, disabled: busy || allowed === null, onChange: (e) => change(e.target.checked) }), ' ', t('AI가 발행·삭제하도록 허용')] }), _jsx("p", { className: "muted small", children: tNodes('{0} 지운 글은 휴지통에서 30일 안에 복구할 수 있어요. 꺼 두면 AI는 임시글과 "발행 대기"까지만 만들어요.', { 0: AI_PUBLISH_WARNING }) }), _jsx("p", { className: "muted small ai-publish-reconnect", children: t('끄면 바로 막혀요. 켠 뒤에는 AI 앱에서 devlog 연결을 다시 시작해야 발행·삭제 도구가 보여요.') }), _jsx("div", { role: "status", children: error && _jsx("p", { className: "error", children: error }) })] }));
}
/**
 * "AI 일기 쓰기" (061·071). 기본은 꺼짐. 켜면 연결한 AI에 add_note가 열리고, 매일 고른 시각(KST, 기본 자정)에 메모가 일기로 묶인다.
 * 늘 임시글로 만들고, AI 발행을 허용했으면 바로 발행한다. 끄면 아직 묶지 않은 메모도 지운다.
 */
function AiDiaryToggle() {
    const [setting, setSetting] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const load = () => {
        setLoadFailed(false);
        aiDiaryApi.get().then(setSetting).catch(() => setLoadFailed(true));
    };
    useEffect(load, []);
    const save = async (on, hour) => {
        setBusy(true);
        setError(null);
        try {
            setSetting(await aiDiaryApi.set(on, hour));
        }
        catch {
            setError(t('설정을 바꾸지 못했어요. 다시 시도해 주세요.'));
        }
        finally {
            setBusy(false);
        }
    };
    const change = (on) => {
        if (!on && !confirm(t('AI 일기 쓰기를 끌까요?\n아직 일기로 묶지 않은 AI 메모도 함께 지워져요. 이미 만든 일기는 그대로 남아요.')))
            return;
        void save(on);
    };
    const enabled = setting?.enabled === true;
    const when = diaryHourLabel(setting?.hour ?? 0);
    return (_jsxs("div", { className: "ai-publish ai-diary", children: [_jsx("h3", { children: t('AI 일기') }), _jsxs("label", { title: t('AI를 쓴 날마다 {0}에 작업 메모를 일기로 모아요', { 0: when }), children: [_jsx("input", { type: "checkbox", checked: enabled, disabled: busy || setting === null, onChange: (e) => change(e.target.checked) }), ' ', t('AI 일기 쓰기')] }), _jsxs("label", { className: "ai-diary-hour", children: [t('일기 쓰는 시각'), ' ', _jsx("select", { value: setting?.hour ?? 0, disabled: busy || !enabled, title: t('매일 이 시각(한국 시간)에 그때까지의 메모를 일기로 묶어요'), onChange: (e) => void save(true, Number(e.target.value)), children: Array.from({ length: 24 }, (_, h) => _jsx("option", { value: h, children: diaryHourLabel(h) }, h)) })] }), _jsx("p", { className: "muted small", children: tNodes('켜면 연결한 AI가 작업을 마칠 때마다 한두 문장 메모를 남기고, 매일 {0}(한국 시간)에 그때까지의 메모가 주제별로 묶인 {1}가 돼요. AI를 쓰지 않은 날은 만들지 않아요. 일기는 임시글로 만들고, 위에서 {2}했으면 글에 정해진 공개 범위로 바로 발행해요.', { 0: when, 1: _jsx("b", { children: t('일기') }), 2: _jsx("b", { children: t('AI 발행을 허용') }) }) }), _jsx("p", { className: "muted small ai-publish-reconnect", children: t('켠 뒤에는 AI 앱에서 devlog 연결을 다시 시작해야 메모 도구가 보여요. 끄면 아직 묶지 않은 메모도 지워요.') }), loadFailed && (_jsx("p", { className: "error", role: "status", children: tNodes('설정을 불러오지 못했어요. {0}', { 0: _jsx("button", { type: "button", className: "btn btn-text", title: t('AI 일기 설정을 다시 불러와요'), onClick: load, children: t('다시 시도') }) }) })), _jsx("div", { role: "status", children: error && _jsx("p", { className: "error", children: error }) })] }));
}
