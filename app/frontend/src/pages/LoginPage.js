import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fullDate } from '../lib/format';
import { Link, navigate, useLocation } from '../lib/router';
import { t } from '../lib/i18n';
const MESSAGES = {
    SOCIAL_LOGIN_FAILED: t('소셜 로그인을 마치지 못했어요. 다시 시도해 주세요.'),
    TEMPORARILY_UNAVAILABLE: t('지금은 로그인할 수 없어요. 잠시 후 다시 시도해 주세요.'),
    TOO_MANY_REQUESTS: t('로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.'),
};
/** 정지 안내. 언어마다 어순이 달라 기간·사유가 있는 경우를 문장째 고른다 */
function suspendedMessage(d) {
    const until = d?.suspendedUntil ? fullDate(d.suspendedUntil) : null;
    const base = until ? t('정지된 계정이에요 ({0}까지).', { 0: until }) : t('정지된 계정이에요.');
    return d?.reason ? `${base} ${t('사유: {0}', { 0: d.reason })}` : base;
}
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
    useEffect(() => { document.title = t('로그인 - devlog'); }, []);
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
    let message = error ? MESSAGES[error] ?? t('로그인하지 못했어요. 다시 시도해 주세요.') : null;
    if (error === 'ACCOUNT_SUSPENDED') {
        message = suspendedMessage(detail);
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
                return setFormError(t('로그인하지 못했어요. 다시 시도해 주세요.'));
            if (err.code === 'ACCOUNT_SUSPENDED') {
                const d = err.details;
                setFormError(suspendedMessage(d));
            }
            else {
                setFormError(MESSAGES[err.code] && err.code !== 'TOO_MANY_REQUESTS' ? MESSAGES[err.code] : err.message);
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: t('로그인') }), _jsx("p", { className: "muted", children: t('개발 기록을 남기고 나누는 블로그예요.') }), message && _jsx("div", { className: "banner banner-warn", role: "alert", children: message }), _jsxs("form", { className: "form", onSubmit: submit, children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: t('이메일') }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "username", required: true, maxLength: 254 })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('비밀번호') }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password", required: true })] }), formError && _jsx("div", { className: "banner banner-warn", role: "alert", children: formError }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting, children: submitting ? t('로그인하는 중…') : t('이메일로 로그인') }), _jsxs("p", { className: "auth-links small", children: [_jsx(Link, { to: "/forgot-password", children: t('비밀번호 찾기') }), _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), _jsx(Link, { to: `/signup?redirect=${encodeURIComponent(safeRedirect)}`, children: t('이메일로 가입') })] })] }), _jsx("div", { className: "divider", children: _jsx("span", { children: t('또는') }) }), social.includes('google') && _jsxs("a", { className: "btn btn-google", href: `/oauth2/authorization/google?redirect=${encodeURIComponent(redirect)}`, "data-tip": t('Google 계정으로 로그인하거나 가입해요'), children: [_jsxs("svg", { viewBox: "0 0 48 48", width: "20", height: "20", "aria-hidden": "true", children: [_jsx("path", { fill: "#EA4335", d: "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" }), _jsx("path", { fill: "#4285F4", d: "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" }), _jsx("path", { fill: "#FBBC05", d: "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" }), _jsx("path", { fill: "#34A853", d: "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" })] }), t('Google로 계속하기')] }), social.includes('kakao') && _jsxs("a", { className: "btn btn-kakao", href: `/oauth2/authorization/kakao?redirect=${encodeURIComponent(redirect)}`, "data-tip": t('카카오 계정으로 로그인하거나 가입해요'), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "20", height: "20", "aria-hidden": "true", children: _jsx("path", { fill: "currentColor", d: "M12 3C6.48 3 2 6.52 2 10.86c0 2.8 1.86 5.25 4.66 6.64l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.06 1.07.1 1.62.1 5.52 0 10-3.52 10-7.84S17.52 3 12 3z" }) }), t('카카오로 계속하기')] }), social.includes('facebook') && _jsxs("a", { className: "btn btn-facebook", href: `/oauth2/authorization/facebook?redirect=${encodeURIComponent(redirect)}`, "data-tip": t('Facebook 계정으로 로그인하거나 가입해요'), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "20", height: "20", "aria-hidden": "true", children: _jsx("path", { fill: "currentColor", d: "M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z" }) }), t('Facebook으로 계속하기')] }), _jsxs("a", { className: "btn btn-github", href: `/oauth2/authorization/github?redirect=${encodeURIComponent(redirect)}`, "data-tip": t('GitHub 계정으로 로그인하거나 가입해요'), children: [_jsx("svg", { viewBox: "0 0 16 16", width: "20", height: "20", "aria-hidden": "true", children: _jsx("path", { fill: "currentColor", d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" }) }), t('GitHub로 계속하기')] }), _jsx("p", { className: "muted small", children: t('소셜 계정으로 처음 오셨다면 블로그 주소와 닉네임을 정하고 가입을 마쳐요.') })] }));
}
