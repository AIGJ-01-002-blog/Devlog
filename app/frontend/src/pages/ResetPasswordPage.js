import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { PasswordRules } from '../components/PasswordRules';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fieldErrors } from '../lib/fieldErrors';
import { passwordOk } from '../lib/password';
import { Link, useLocation } from '../lib/router';
import { t } from '../lib/i18n';
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
        return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: t('비밀번호를 바꿨어요') }), _jsx("p", { className: "muted", children: t('모든 기기에서 로그아웃됐어요. 새 비밀번호로 다시 로그인해 주세요.') }), _jsx(Link, { to: "/login", className: "btn btn-primary btn-block", children: t('로그인') })] }));
    }
    if (valid === false) {
        return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: t('링크가 만료됐어요') }), _jsx("p", { className: "muted", children: t('이미 쓴 링크이거나 30분이 지났어요. 비밀번호 찾기를 다시 해 주세요.') }), _jsx(Link, { to: "/forgot-password", className: "btn btn-primary btn-block", children: t('비밀번호 찾기') })] }));
    }
    if (valid == null)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: t('확인하는 중…') }) });
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: t('새 비밀번호') }), _jsxs("form", { className: "form", onSubmit: submit, children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: t('새 비밀번호') }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "new-password", maxLength: 64, required: true, "aria-invalid": !!errors.password, "aria-describedby": errors.password ? 'reset-pw-error' : undefined }), _jsx(PasswordRules, { password: password }), errors.password && _jsx("small", { id: "reset-pw-error", className: "error", role: "alert", children: errors.password })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('새 비밀번호 확인') }), _jsx("input", { type: "password", value: confirm, onChange: (e) => setConfirm(e.target.value), autoComplete: "new-password", maxLength: 64, required: true, "aria-invalid": !!errors.passwordConfirm || (!!confirm && confirm !== password), "aria-describedby": errors.passwordConfirm || (confirm && confirm !== password) ? 'reset-confirm-error' : undefined }), (errors.passwordConfirm || (confirm && confirm !== password)) && (_jsx("small", { id: "reset-confirm-error", className: "error", role: errors.passwordConfirm ? 'alert' : undefined, children: errors.passwordConfirm ?? t('비밀번호가 서로 달라요.') }))] }), errors.form && _jsx("div", { className: "banner banner-warn", role: "alert", children: errors.form }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting || !passwordOk(password) || password !== confirm, children: submitting ? t('저장하는 중…') : t('비밀번호 저장') })] })] }));
}
