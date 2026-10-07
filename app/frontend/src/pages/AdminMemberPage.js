import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { AuthorPanel } from '../components/AuthorPanel';
import { SuspendForm } from '../components/SuspendForm';
import { ApiError } from '../lib/api';
import { adminApi } from '../lib/moderation';
import { Link } from '../lib/router';
/** 회원 관리 (019 US4): 정지·해제와 이력. 관리자는 다른 관리자나 자신을 정지할 수 없다. */
export function AdminMemberPage({ handle }) {
    const [m, setM] = useState(null);
    const [missing, setMissing] = useState(false);
    const [message, setMessage] = useState(null);
    useEffect(() => {
        document.title = '회원 관리 - devlog';
        adminApi.member(handle).then(setM).catch(() => setMissing(true));
    }, [handle]);
    if (missing)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { children: "\uD68C\uC6D0\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694." }) });
    if (!m)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    const act = async (work, ok) => {
        setMessage(null);
        try {
            setM(await work());
            setMessage({ ok: true, text: ok });
        }
        catch (e) {
            setMessage({ ok: false, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '처리하지 못했어요.' });
        }
    };
    return (_jsxs("main", { className: "container narrow admin", children: [_jsxs("p", { children: [_jsx(Link, { to: "/admin/reports", children: "\u2190 \uC2E0\uACE0 \uBAA9\uB85D" }), " \u00B7 ", _jsx("a", { href: `/@${m.handle}`, children: "\uBE14\uB85C\uADF8 \uBCF4\uAE30" })] }), _jsx("h1", { className: "page-title", children: "\uD68C\uC6D0 \uAD00\uB9AC" }), _jsx(AuthorPanel, { author: m, linkToMember: false }), m.suspended ? (_jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uC815\uC9C0 \uD574\uC81C" }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: () => act(() => adminApi.lift(m.handle), '정지를 해제했어요.'), children: "\uC815\uC9C0 \uD574\uC81C" })] })) : !m.admin && (_jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uC815\uC9C0" }), _jsx("p", { className: "muted small", children: "\uC815\uC9C0\uD558\uBA74 \uBAA8\uB4E0 \uAE30\uAE30\uC5D0\uC11C \uBC14\uB85C \uB85C\uADF8\uC544\uC6C3\uB418\uACE0, \uAE30\uD55C\uAE4C\uC9C0 \uB85C\uADF8\uC778\uD560 \uC218 \uC5C6\uC5B4\uC694. \uAE00\u00B7\uB313\uAE00\uC740 \uADF8\uB300\uB85C \uBCF4\uC5EC\uC694." }), _jsx(SuspendForm, { onSubmit: (days, reason) => act(() => adminApi.suspend(m.handle, days, reason), '정지했어요.') })] })), message && _jsx("p", { className: message.ok ? 'banner banner-ok' : 'error', role: message.ok ? 'status' : 'alert', children: message.text })] }));
}
