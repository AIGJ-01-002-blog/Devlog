import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Link } from '../lib/router';
import { t } from '../lib/i18n';
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
            setError(err instanceof ApiError ? err.fieldError('email') ?? err.message : t('잠시 후 다시 시도해 주세요.'));
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: t('비밀번호 찾기') }), sent ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "banner banner-ok", role: "status", children: t('가입된 이메일이면 안내 메일을 보냈어요.') }), _jsx("p", { className: "muted small", children: t('메일이 오지 않으면 스팸함을 확인하거나 1분 뒤 다시 요청해 주세요. 링크는 30분 동안 한 번만 쓸 수 있어요.') }), _jsx(Link, { to: "/login", className: "btn btn-outline btn-block", children: t('로그인으로') })] })) : (_jsxs("form", { className: "form", onSubmit: submit, children: [_jsx("p", { className: "muted", children: t('가입한 이메일을 넣으면 비밀번호를 다시 정할 수 있는 링크를 보내 드려요.') }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('이메일') }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email", maxLength: 254, required: true })] }), error && _jsx("div", { className: "banner banner-warn", role: "alert", children: error }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting, children: submitting ? t('보내는 중…') : t('재설정 메일 받기') })] }))] }));
}
