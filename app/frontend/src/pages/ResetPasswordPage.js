import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { PasswordRules } from '../components/PasswordRules';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fieldErrors } from '../lib/fieldErrors';
import { passwordOk } from '../lib/password';
import { Link, useLocation } from '../lib/router';
/** 재설정 링크로 새 비밀번호 정하기 (004 US3). 저장하면 모든 기기에서 로그아웃된다. */
export function ResetPasswordPage() {
    const { search } = useLocation();
    const { refresh } = useAuth();
    const token = search.get('token') ?? '';
    const [valid, setValid] = useState(null);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState({});
    const [done, setDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (!token)
            return setValid(false);
        api('/api/auth/password/reset-check', { method: 'POST', body: { token } })
            .then((r) => setValid(r.valid))
            .catch(() => setValid(false));
    }, [token]);
    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        try {
            await api('/api/auth/password/reset', { method: 'POST', body: { token, password, passwordConfirm: confirm } });
            setDone(true);
            await refresh();
        }
        catch (err) {
            if (err instanceof ApiError && err.code === 'LINK_EXPIRED')
                setValid(false);
            else
                setErrors(fieldErrors(err));
        }
        finally {
            setSubmitting(false);
        }
    };
    if (done) {
        return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uBE44\uBC00\uBC88\uD638\uB97C \uBC14\uAFE8\uC5B4\uC694" }), _jsx("p", { className: "muted", children: "\uBAA8\uB4E0 \uAE30\uAE30\uC5D0\uC11C \uB85C\uADF8\uC544\uC6C3\uB410\uC5B4\uC694. \uC0C8 \uBE44\uBC00\uBC88\uD638\uB85C \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694." }), _jsx(Link, { to: "/login", className: "btn btn-primary btn-block", children: "\uB85C\uADF8\uC778" })] }));
    }
    if (valid === false) {
        return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uB9C1\uD06C\uAC00 \uB9CC\uB8CC\uB410\uC5B4\uC694" }), _jsx("p", { className: "muted", children: "\uC774\uBBF8 \uC4F4 \uB9C1\uD06C\uC774\uAC70\uB098 30\uBD84\uC774 \uC9C0\uB0AC\uC5B4\uC694. \uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30\uB97C \uB2E4\uC2DC \uD574 \uC8FC\uC138\uC694." }), _jsx(Link, { to: "/forgot-password", className: "btn btn-primary btn-block", children: "\uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30" })] }));
    }
    if (valid == null)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uD655\uC778\uD558\uB294 \uC911\u2026" }) });
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uC0C8 \uBE44\uBC00\uBC88\uD638" }), _jsxs("form", { className: "form", onSubmit: submit, children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC0C8 \uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "new-password", maxLength: 64, required: true }), _jsx(PasswordRules, { password: password }), errors.password && _jsx("small", { className: "error", children: errors.password })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778" }), _jsx("input", { type: "password", value: confirm, onChange: (e) => setConfirm(e.target.value), autoComplete: "new-password", maxLength: 64, required: true }), (errors.passwordConfirm || (confirm && confirm !== password)) && _jsx("small", { className: "error", children: errors.passwordConfirm ?? '비밀번호가 서로 달라요.' })] }), errors.form && _jsx("div", { className: "banner banner-warn", role: "alert", children: errors.form }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting || !passwordOk(password) || password !== confirm, children: submitting ? '저장하는 중…' : '비밀번호 저장' })] })] }));
}
