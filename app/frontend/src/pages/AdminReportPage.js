import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { AdminNav } from '../components/AdminNav';
import { AuthorPanel } from '../components/AuthorPanel';
import { SuspendFields } from '../components/SuspendForm';
import { ApiError } from '../lib/api';
import { fullDate } from '../lib/format';
import { adminApi, REASONS, reasonLabel, reasonSummary, STATUS_LABEL, TARGET_STATE_LABEL, } from '../lib/moderation';
import { Link } from '../lib/router';
/**
 * 신고 처리 (019 US2·US3·US4). 신고 시점 스냅샷으로 판단하고, 숨기기(사유) 또는 문제없음으로 대기 신고를 한 번에 닫는다.
 * 정지를 함께 할 수 있다. 처리됨 사건은 [숨김 해제]. 자기 콘텐츠는 처리할 수 없다.
 */
export function AdminReportPage({ id }) {
    const [c, setC] = useState(null);
    const [missing, setMissing] = useState(false);
    const [action, setAction] = useState(null);
    const [hideReason, setHideReason] = useState('');
    const [suspend, setSuspend] = useState(false);
    const [days, setDays] = useState(7);
    const [suspendReason, setSuspendReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    // 입력 확인 오류는 [처리하기] 바로 위에 보이고 그리로 초점을 옮긴다
    const [invalid, setInvalid] = useState(null);
    const invalidRef = useRef(null);
    useEffect(() => { if (invalid)
        invalidRef.current?.focus(); }, [invalid]);
    // 고르거나 고치면 지난 확인 오류는 지운다
    useEffect(() => { setInvalid(null); }, [action, hideReason, suspend, days, suspendReason]);
    useEffect(() => {
        document.title = '신고 처리 - devlog';
        adminApi.detail(Number(id)).then((d) => {
            setC(d);
            const top = REASONS.map((r) => r.code).sort((a, b) => (d.reasons[b] ?? 0) - (d.reasons[a] ?? 0))[0];
            setHideReason(top);
        }).catch(() => setMissing(true));
    }, [id]);
    if (missing)
        return _jsxs("main", { className: "container narrow", children: [_jsx("p", { children: "\uC2E0\uACE0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694." }), _jsx(Link, { to: "/admin/reports", children: "\uBAA9\uB85D\uC73C\uB85C" })] });
    if (!c)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    const canResolve = c.status === 'PENDING' && !c.mine;
    const canUnhide = c.status === 'HIDDEN' && c.targetState === 'HIDDEN' && !c.mine;
    const run = async (work, ok) => {
        setBusy(true);
        setMessage(null);
        setInvalid(null);
        try {
            setC(await work());
            setMessage({ ok: true, text: ok });
        }
        catch (e) {
            setMessage({ ok: false, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '처리하지 못했어요.' });
            // 숨김·반려는 끝났고 정지만 실패했을 수 있어 지금 상태를 다시 읽는다
            adminApi.detail(c.caseId).then(setC).catch(() => { });
        }
        finally {
            setBusy(false);
        }
    };
    const resolve = () => {
        if (!action)
            return setInvalid('처리 방법을 골라 주세요.');
        if (action === 'HIDE' && !hideReason)
            return setInvalid('숨기는 사유를 골라 주세요.');
        if (suspend && !suspendReason.trim())
            return setInvalid('정지 사유를 적어 주세요.');
        void run(() => adminApi.resolve(c.caseId, action, action === 'HIDE' ? hideReason : null, suspend ? { days, reason: suspendReason.trim() } : null), action === 'HIDE' ? '숨겼어요.' : '문제없음으로 처리했어요.');
    };
    return (_jsxs("main", { className: "container narrow admin", children: [_jsx(AdminNav, {}), _jsx("p", { children: _jsx(Link, { to: "/admin/reports", children: "\u2190 \uC2E0\uACE0 \uBAA9\uB85D" }) }), _jsxs("h1", { className: "page-title", children: [c.targetType === 'POST' ? '글' : '댓글', " \uC2E0\uACE0 ", _jsx("span", { className: "badge", children: STATUS_LABEL[c.status] })] }), _jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uB300\uC0C1" }), _jsxs("p", { children: ["\uC9C0\uAE08 \uC0C1\uD0DC: ", _jsx("b", { children: TARGET_STATE_LABEL[c.targetState] }), c.hiddenReason && ` (사유: ${reasonLabel(c.hiddenReason)})`, c.link && _jsxs(_Fragment, { children: [" \u00B7 ", _jsx("a", { href: c.link, children: "\uC8FC\uC18C \uC5F4\uAE30" })] })] }), _jsx("p", { className: "muted small", children: "\uBE44\uACF5\uAC1C\u00B7\uD734\uC9C0\uD1B5\uC774 \uB41C \uC6D0\uBB38\uC740 \uC5F4 \uC218 \uC5C6\uC5B4\uC694. \uC544\uB798\uB294 \uCCAB \uC2E0\uACE0 \uB54C \uBCF5\uC0AC\uD55C \uB0B4\uC6A9\uC774\uC5D0\uC694." }), _jsxs("div", { className: "snapshot", children: [c.snapshotTitle && _jsx("h3", { children: c.snapshotTitle }), c.snapshotContent != null ? _jsx("pre", { children: c.snapshotContent }) : _jsx("p", { className: "muted", children: "\uBCF4\uAD00 \uAE30\uAC04\uC774 \uC9C0\uB098 \uB0B4\uC6A9\uC744 \uBE44\uC6E0\uC5B4\uC694." })] })] }), _jsxs("section", { className: "admin-section", children: [_jsxs("h2", { children: ["\uC2E0\uACE0 ", c.reports.length, "\uAC74"] }), _jsx("p", { children: reasonSummary(c.reasons) }), _jsx("ul", { className: "report-lines", children: c.reports.filter((r) => r.detail).map((r, i) => (_jsxs("li", { children: [_jsx("span", { className: "muted small", children: fullDate(r.at) }), " ", r.detail] }, i))) })] }), _jsx(AuthorPanel, { author: c.author }), c.mine && _jsx("p", { className: "banner", children: "\uB0B4 \uAE00\u00B7\uB313\uAE00\uC5D0 \uB300\uD55C \uC2E0\uACE0\uB77C \uCC98\uB9AC\uD560 \uC218 \uC5C6\uC5B4\uC694." }), canResolve && (_jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uCC98\uB9AC" }), _jsxs("fieldset", { className: "field", children: [_jsx("legend", { children: "\uCC98\uB9AC \uBC29\uBC95" }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "action", checked: action === 'HIDE', onChange: () => setAction('HIDE') }), " \uC228\uAE30\uAE30"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "action", checked: action === 'REJECT', onChange: () => setAction('REJECT') }), " \uBB38\uC81C\uC5C6\uC74C (\uC2E0\uACE0 \uBC18\uB824)"] })] }), action === 'HIDE' && (_jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC228\uAE30\uB294 \uC0AC\uC720 (\uC791\uC131\uC790\uC5D0\uAC8C \uBCF4\uC5EC\uC694)" }), _jsx("select", { value: hideReason, onChange: (e) => setHideReason(e.target.value), children: REASONS.map((r) => _jsx("option", { value: r.code, children: r.label }, r.code)) })] })), !c.author.admin && !c.author.suspended && (_jsxs("label", { className: "check", children: [_jsx("input", { type: "checkbox", checked: suspend, onChange: (e) => setSuspend(e.target.checked) }), " \uC791\uC131\uC790\uB3C4 \uC815\uC9C0\uD558\uAE30"] })), suspend && _jsx(SuspendFields, { days: days, reason: suspendReason, onChange: (d, r) => { setDays(d); setSuspendReason(r); } }), invalid && _jsx("p", { ref: invalidRef, className: "error", role: "alert", tabIndex: -1, children: invalid }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: resolve, disabled: busy, children: busy ? '처리 중…' : '처리하기' })] })), canUnhide && (_jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uC228\uAE40 \uD574\uC81C" }), _jsx("p", { className: "muted small", children: "\uC6D0\uB798\uB300\uB85C \uB3CC\uC544\uC624\uACE0 \uC791\uC131\uC790\uC5D0\uAC8C \uC54C\uB9AC\uC9C0 \uC54A\uC544\uC694." }), _jsx("button", { type: "button", className: "btn btn-outline", disabled: busy, onClick: () => run(() => adminApi.unhide(c.caseId), '숨김을 해제했어요.'), children: "\uC228\uAE40 \uD574\uC81C" })] })), message && _jsx("p", { className: message.ok ? 'banner banner-ok' : 'error', role: message.ok ? 'status' : 'alert', children: message.text })] }));
}
