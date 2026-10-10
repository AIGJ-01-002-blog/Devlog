import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fullDate } from '../lib/format';
import { Link, navigate, useLocation } from '../lib/router';
const MESSAGES = {
    SOCIAL_LOGIN_FAILED: '소셜 로그인을 마치지 못했어요. 다시 시도해 주세요.',
    TEMPORARILY_UNAVAILABLE: '지금은 로그인할 수 없어요. 잠시 후 다시 시도해 주세요.',
    TOO_MANY_REQUESTS: '로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.',
};
export function LoginPage() {
    const { search } = useLocation();
    const { me, refresh } = useAuth();
    const [detail, setDetail] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [social, setSocial] = useState(['github']);
    // 안내 화면(/mcp 등)에서 화면 안 이동으로 오면 앞 화면 제목이 남지 않게
    useEffect(() => { document.title = '로그인 - devlog'; }, []);
    useEffect(() => {
        api('/api/auth/providers').then((p) => setSocial(p.social)).catch(() => undefined);
    }, []);
    const error = search.get('error');
    const redirect = search.get('redirect') ?? '/';
    useEffect(() => {
        if (me?.authenticated)
            navigate(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/', { replace: true });
    }, [me, redirect]);
    useEffect(() => {
        if (error === 'ACCOUNT_SUSPENDED')
            api('/api/auth/login-error').then((d) => d && setDetail(d)).catch(() => undefined);
    }, [error]);
    let message = error ? MESSAGES[error] ?? '로그인하지 못했어요. 다시 시도해 주세요.' : null;
    if (error === 'ACCOUNT_SUSPENDED') {
        message = `정지된 계정이에요${detail?.suspendedUntil ? ` (${fullDate(detail.suspendedUntil)}까지)` : ''}.${detail?.reason ? ` 사유: ${detail.reason}` : ''}`;
    }
    const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        try {
            await api('/api/auth/redirect', { method: 'POST', body: { redirect: safeRedirect } });
            const r = await api('/api/auth/login', { method: 'POST', body: { email, password } });
            await refresh();
            navigate(r.redirect || '/', { replace: true });
        }
        catch (err) {
            setPassword('');
            if (!(err instanceof ApiError))
                return setFormError('로그인하지 못했어요. 다시 시도해 주세요.');
            if (err.code === 'ACCOUNT_SUSPENDED') {
                const d = err.details;
                setFormError(`정지된 계정이에요${d?.suspendedUntil ? ` (${fullDate(d.suspendedUntil)}까지)` : ''}.${d?.reason ? ` 사유: ${d.reason}` : ''}`);
            }
            else {
                setFormError(MESSAGES[err.code] && err.code !== 'TOO_MANY_REQUESTS' ? MESSAGES[err.code] : err.message);
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uB85C\uADF8\uC778" }), _jsx("p", { className: "muted", children: "\uAC1C\uBC1C \uAE30\uB85D\uC744 \uB0A8\uAE30\uACE0 \uB098\uB204\uB294 \uBE14\uB85C\uADF8\uC608\uC694." }), message && _jsx("div", { className: "banner banner-warn", role: "alert", children: message }), _jsxs("form", { className: "form", onSubmit: submit, children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC774\uBA54\uC77C" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "username", required: true, maxLength: 254 })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password", required: true })] }), formError && _jsx("div", { className: "banner banner-warn", role: "alert", children: formError }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting, children: submitting ? '로그인하는 중…' : '이메일로 로그인' }), _jsxs("p", { className: "auth-links small", children: [_jsx(Link, { to: "/forgot-password", children: "\uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30" }), _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), _jsx(Link, { to: `/signup?redirect=${encodeURIComponent(safeRedirect)}`, children: "\uC774\uBA54\uC77C\uB85C \uAC00\uC785" })] })] }), _jsx("div", { className: "divider", children: _jsx("span", { children: "\uB610\uB294" }) }), social.includes('google') && _jsxs("a", { className: "btn btn-google", href: `/oauth2/authorization/google?redirect=${encodeURIComponent(redirect)}`, "data-tip": "Google \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD558\uAC70\uB098 \uAC00\uC785\uD574\uC694", children: [_jsxs("svg", { viewBox: "0 0 48 48", width: "20", height: "20", "aria-hidden": "true", children: [_jsx("path", { fill: "#EA4335", d: "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" }), _jsx("path", { fill: "#4285F4", d: "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" }), _jsx("path", { fill: "#FBBC05", d: "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" }), _jsx("path", { fill: "#34A853", d: "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" })] }), "Google\uB85C \uACC4\uC18D\uD558\uAE30"] }), social.includes('kakao') && _jsxs("a", { className: "btn btn-kakao", href: `/oauth2/authorization/kakao?redirect=${encodeURIComponent(redirect)}`, "data-tip": "\uCE74\uCE74\uC624 \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD558\uAC70\uB098 \uAC00\uC785\uD574\uC694", children: [_jsx("svg", { viewBox: "0 0 24 24", width: "20", height: "20", "aria-hidden": "true", children: _jsx("path", { fill: "currentColor", d: "M12 3C6.48 3 2 6.52 2 10.86c0 2.8 1.86 5.25 4.66 6.64l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.06 1.07.1 1.62.1 5.52 0 10-3.52 10-7.84S17.52 3 12 3z" }) }), "\uCE74\uCE74\uC624\uB85C \uACC4\uC18D\uD558\uAE30"] }), _jsxs("a", { className: "btn btn-github", href: `/oauth2/authorization/github?redirect=${encodeURIComponent(redirect)}`, "data-tip": "GitHub \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD558\uAC70\uB098 \uAC00\uC785\uD574\uC694", children: [_jsx("svg", { viewBox: "0 0 16 16", width: "20", height: "20", "aria-hidden": "true", children: _jsx("path", { fill: "currentColor", d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" }) }), "GitHub\uB85C \uACC4\uC18D\uD558\uAE30"] }), _jsxs("p", { className: "muted small", children: [social.includes('kakao') ? '카카오·' : '', "Google\u00B7GitHub\uB85C \uCC98\uC74C \uC624\uC168\uB2E4\uBA74 \uBE14\uB85C\uADF8 \uC8FC\uC18C\uC640 \uB2C9\uB124\uC784\uC744 \uC815\uD558\uACE0 \uAC00\uC785\uC744 \uB9C8\uCCD0\uC694."] })] }));
}
