import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Link } from '../lib/router';
/** 비밀번호 찾기 (004 US3): 가입 여부와 상관없이 같은 안내를 보여 준다. */
export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await api('/api/auth/password/reset-request', { method: 'POST', body: { email } });
            setSent(true);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.fieldError('email') ?? err.message : '잠시 후 다시 시도해 주세요.');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30" }), sent ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "banner banner-ok", role: "status", children: "\uAC00\uC785\uB41C \uC774\uBA54\uC77C\uC774\uBA74 \uC548\uB0B4 \uBA54\uC77C\uC744 \uBCF4\uB0C8\uC5B4\uC694." }), _jsx("p", { className: "muted small", children: "\uBA54\uC77C\uC774 \uC624\uC9C0 \uC54A\uC73C\uBA74 \uC2A4\uD338\uD568\uC744 \uD655\uC778\uD558\uAC70\uB098 1\uBD84 \uB4A4 \uB2E4\uC2DC \uC694\uCCAD\uD574 \uC8FC\uC138\uC694. \uB9C1\uD06C\uB294 30\uBD84 \uB3D9\uC548 \uD55C \uBC88\uB9CC \uC4F8 \uC218 \uC788\uC5B4\uC694." }), _jsx(Link, { to: "/login", className: "btn btn-outline btn-block", children: "\uB85C\uADF8\uC778\uC73C\uB85C" })] })) : (_jsxs("form", { className: "form", onSubmit: submit, children: [_jsx("p", { className: "muted", children: "\uAC00\uC785\uD55C \uC774\uBA54\uC77C\uC744 \uB123\uC73C\uBA74 \uBE44\uBC00\uBC88\uD638\uB97C \uB2E4\uC2DC \uC815\uD560 \uC218 \uC788\uB294 \uB9C1\uD06C\uB97C \uBCF4\uB0B4 \uB4DC\uB824\uC694." }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC774\uBA54\uC77C" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email", maxLength: 254, required: true })] }), error && _jsx("div", { className: "banner banner-warn", role: "alert", children: error }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting, children: submitting ? '보내는 중…' : '재설정 메일 받기' })] }))] }));
}
