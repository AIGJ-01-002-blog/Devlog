import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { AdminNav } from '../components/AdminNav';
import { ApiError } from '../lib/api';
import { fullDate } from '../lib/format';
import { adminInquiryApi, ANSWER_MAX, STATUS_HINT, STATUS_LABEL, categoryLabel, releaseLink, } from '../lib/inquiry';
import { Link } from '../lib/router';
const STATUSES = ['RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
/**
 * 문의 처리 (054). 본문은 사용자가 쓴 글자 그대로 보여 준다(HTML로 그리지 않는다).
 * 상태·답변·고친 버전을 한 번에 저장하고, 답변이 새로 붙거나 바뀌면 서버가 회원에게 알린다.
 */
export function AdminInquiryPage({ id }) {
    const [item, setItem] = useState(null);
    const [missing, setMissing] = useState(false);
    const [status, setStatus] = useState('RECEIVED');
    const [answer, setAnswer] = useState('');
    const [fixed, setFixed] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const fill = (i) => {
        setItem(i);
        setStatus(i.status);
        setAnswer(i.answer ?? '');
        setFixed(i.fixedVersion ?? '');
    };
    useEffect(() => {
        document.title = '문의 처리 - devlog';
        adminInquiryApi.detail(Number(id)).then(fill).catch(() => setMissing(true));
    }, [id]);
    if (missing)
        return _jsxs("main", { className: "container narrow", children: [_jsx("p", { children: "\uBB38\uC758\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694." }), _jsx(Link, { to: "/admin/inquiries", children: "\uBAA9\uB85D\uC73C\uB85C" })] });
    if (!item)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    const save = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const willNotify = answer.trim() !== '' && answer.trim() !== (item.answer ?? '');
            fill(await adminInquiryApi.update(item.id, { status, answer, fixedVersion: fixed }));
            setMessage({ ok: true, text: willNotify ? '저장했어요. 회원에게 답변 알림을 보냈어요.' : '저장했어요.' });
        }
        catch (e) {
            setMessage({ ok: false, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '저장하지 못했어요.' });
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("main", { className: "container narrow admin", children: [_jsx(AdminNav, {}), _jsx("p", { className: "small", children: _jsx(Link, { to: "/admin/inquiries", children: "\u2190 \uBB38\uC758 \uAD00\uB9AC" }) }), _jsx("h1", { className: "page-title admin-inquiry-title", children: item.title }), _jsxs("div", { className: "admin-case-main", children: [_jsx("span", { className: "badge", children: categoryLabel(item.category) }), _jsx("span", { className: `badge status-${item.status.toLowerCase()}`, title: STATUS_HINT[item.status], children: STATUS_LABEL[item.status] }), item.source === 'MCP' && _jsx("span", { className: "badge", title: "\uC5F0\uACB0\uD55C AI\uAC00 report_bug\uB85C \uBCF4\uB0B8 \uC2E0\uACE0", children: "AI \uC2E0\uACE0" })] }), _jsxs("dl", { className: "admin-inquiry-meta small", children: [_jsx("dt", { children: "\uBC88\uD638" }), _jsxs("dd", { children: ["#", item.id] }), _jsx("dt", { children: "\uBCF4\uB0B8 \uC0AC\uB78C" }), _jsx("dd", { children: _jsxs(Link, { to: `/admin/members/${item.memberHandle}`, children: [item.memberNickname, " @", item.memberHandle] }) }), _jsx("dt", { children: "\uC811\uC218" }), _jsxs("dd", { children: [fullDate(item.createdAt), item.appVersion && ` · v${item.appVersion}에서`] }), item.clientName && _jsxs(_Fragment, { children: [_jsx("dt", { children: "AI" }), _jsx("dd", { children: item.clientName })] }), item.toolName && _jsxs(_Fragment, { children: [_jsx("dt", { children: "\uB3C4\uAD6C" }), _jsx("dd", { children: _jsx("code", { children: item.toolName }) })] }), item.pageUrl && _jsxs(_Fragment, { children: [_jsx("dt", { children: "\uD654\uBA74" }), _jsx("dd", { children: _jsx("a", { href: item.pageUrl, target: "_blank", rel: "noopener", children: item.pageUrl }) })] })] }), _jsx("section", { className: "support-content admin-inquiry-content", "aria-label": "\uBB38\uC758 \uB0B4\uC6A9", children: item.content }), _jsxs("section", { className: "admin-inquiry-form", children: [_jsx("h2", { children: "\uCC98\uB9AC" }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC0C1\uD0DC" }), _jsx("select", { value: status, onChange: (e) => setStatus(e.target.value), children: STATUSES.map((s) => _jsxs("option", { value: s, children: [STATUS_LABEL[s], " \u2014 ", STATUS_HINT[s]] }, s)) })] }), _jsxs("label", { className: "field", children: [_jsxs("span", { children: ["\uACE0\uCE5C \uBC84\uC804 ", _jsx("span", { className: "muted small", children: "(\uC608: 1.29.0, \uB9B4\uB9AC\uC2A4 \uB178\uD2B8\uB85C \uC774\uC5B4\uC838\uC694)" })] }), _jsx("input", { value: fixed, onChange: (e) => setFixed(e.target.value), placeholder: "1.29.0", inputMode: "decimal", spellCheck: false, autoComplete: "off" })] }), item.fixedVersion && _jsx("p", { className: "small", children: _jsxs(Link, { to: releaseLink(item.fixedVersion), children: ["v", item.fixedVersion, " \uB9B4\uB9AC\uC2A4 \uB178\uD2B8 \uBCF4\uAE30"] }) }), _jsxs("label", { className: "field", children: [_jsxs("span", { children: ["\uB2F5\uBCC0 ", _jsxs("span", { className: "muted small", children: ["(", [...answer].length, "/", ANSWER_MAX, ", \uC0C8\uB85C \uC801\uC73C\uBA74 \uD68C\uC6D0\uC5D0\uAC8C \uC54C\uB9BC\uC774 \uAC00\uC694)"] })] }), _jsx("textarea", { value: answer, maxLength: ANSWER_MAX, rows: 6, onChange: (e) => setAnswer(e.target.value), placeholder: "\uD68C\uC6D0\uC5D0\uAC8C \uBCF4\uC77C \uB2F5\uBCC0" })] }), message && _jsx("p", { className: message.ok ? 'ok small' : 'error small', role: message.ok ? 'status' : 'alert', children: message.text }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: save, disabled: busy, title: "\uC0C1\uD0DC\u00B7\uACE0\uCE5C \uBC84\uC804\u00B7\uB2F5\uBCC0\uC744 \uC800\uC7A5\uD574\uC694", children: busy ? '저장하는 중…' : '저장' })] })] }));
}
