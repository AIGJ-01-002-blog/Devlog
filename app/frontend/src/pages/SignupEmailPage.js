import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { PasswordRules } from '../components/PasswordRules';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fieldErrors } from '../lib/fieldErrors';
import { cleanHandleInput, passwordOk } from '../lib/password';
import { Link, navigate, useLocation } from '../lib/router';
/**
 * 이메일 가입 (004 US1, docs/08 §3): 이메일을 치는 동안 주소를 미리 채우고, 주소를 직접 고치면 더는 바꾸지 않는다.
 * 비밀번호는 규칙별 ✓로 보여 주고, 최종 검사는 서버가 한다.
 */
export function SignupEmailPage() {
    const { me, refresh } = useAuth();
    const { search } = useLocation();
    const redirect = search.get('redirect') ?? '/';
    const [terms, setTermsInfo] = useState(null);
    const [email, setEmail] = useState('');
    const [body, setBody] = useState('');
    const [bodyTouched, setBodyTouched] = useState(false);
    const [autoFilled, setAutoFilled] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [nickname, setNickname] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [handleCheck, setHandleCheck] = useState(null);
    const [nickCheck, setNickCheck] = useState(null);
    const [errors, setErrors] = useState({});
    const [emailTaken, setEmailTaken] = useState(false);
    const [withdrawnAccount, setWithdrawnAccount] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const timers = useRef({});
    useEffect(() => {
        if (me?.authenticated)
            navigate('/', { replace: true });
    }, [me]);
    useEffect(() => {
        api('/api/terms/current').then(setTermsInfo).catch(() => undefined);
    }, []);
    // 이메일 앞부분으로 주소 미리 채우기 (주소 칸을 직접 고친 뒤로는 하지 않는다)
    useEffect(() => {
        if (bodyTouched)
            return;
        const at = email.indexOf('@');
        const local = (at < 0 ? email : email.slice(0, at)).trim();
        clearTimeout(timers.current.s);
        if (!local) {
            setBody('');
            setAutoFilled(false);
            return;
        }
        timers.current.s = window.setTimeout(() => {
            api(`/api/handles/suggestion?material=${encodeURIComponent(local)}`)
                .then((r) => { setBody(r.handleBody); setAutoFilled(true); })
                .catch(() => undefined);
        }, 400);
    }, [email, bodyTouched]);
    useEffect(() => {
        if (!body)
            return setHandleCheck(null);
        clearTimeout(timers.current.h);
        timers.current.h = window.setTimeout(() => {
            api(`/api/handles/availability?handle=${encodeURIComponent(body)}`).then(setHandleCheck).catch(() => setHandleCheck(null));
        }, 500);
    }, [body]);
    useEffect(() => {
        if (!nickname)
            return setNickCheck(null);
        clearTimeout(timers.current.n);
        timers.current.n = window.setTimeout(() => {
            api(`/api/nicknames/availability?nickname=${encodeURIComponent(nickname)}`).then(setNickCheck).catch(() => setNickCheck(null));
        }, 500);
    }, [nickname]);
    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        setEmailTaken(false);
        setWithdrawnAccount(false);
        try {
            await api('/api/auth/redirect', { method: 'POST', body: { redirect } });
            const r = await api('/api/auth/signup/email', {
                method: 'POST',
                body: { email, handleBody: body, password, passwordConfirm: confirm, nickname, agreeTerms, agreePrivacy },
            });
            await refresh();
            navigate(r.redirect || '/', { replace: true });
        }
        catch (err) {
            if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
                setEmailTaken(true);
            }
            else if (err instanceof ApiError && err.code === 'WITHDRAWN_ACCOUNT') {
                setWithdrawnAccount(true);
            }
            else if (err instanceof ApiError && err.code === 'HANDLE_TAKEN') {
                const s = err.details?.suggestion;
                setErrors({ handleBody: `이미 쓰는 주소예요.${s ? ` "${s}"는 어때요?` : ''}` });
            }
            else if (err instanceof ApiError && err.code === 'NICKNAME_TAKEN') {
                setErrors({ nickname: err.message });
            }
            else {
                setErrors(fieldErrors(err));
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    const ready = agreeTerms && agreePrivacy && passwordOk(password, email) && password === confirm && body.length >= 3;
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uC774\uBA54\uC77C\uB85C \uAC00\uC785" }), _jsxs("form", { onSubmit: submit, className: "form", noValidate: true, children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC774\uBA54\uC77C" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), maxLength: 254, autoComplete: "email", required: true, "aria-invalid": !!errors.email || emailTaken || withdrawnAccount }), errors.email && _jsx("small", { className: "error", children: errors.email }), withdrawnAccount && (_jsxs("div", { className: "banner banner-warn", role: "alert", children: ["\uD0C8\uD1F4 \uC2E0\uCCAD\uD55C \uACC4\uC815\uC774 \uC788\uC5B4\uC694. \uB85C\uADF8\uC778\uD558\uBA74 \uBCF5\uAD6C\uD560 \uC218 \uC788\uC5B4\uC694.", _jsx("div", { className: "banner-actions", children: _jsx(Link, { to: "/login", className: "btn btn-outline", children: "\uB85C\uADF8\uC778" }) })] })), emailTaken && (_jsxs("div", { className: "banner banner-warn", role: "alert", children: ["\uC774\uBBF8 \uAC00\uC785\uB41C \uC774\uBA54\uC77C\uC774\uC5D0\uC694.", _jsxs("div", { className: "banner-actions", children: [_jsx(Link, { to: "/login", className: "btn btn-outline", children: "\uB85C\uADF8\uC778" }), _jsx(Link, { to: "/forgot-password", className: "btn btn-outline", children: "\uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30" })] })] }))] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uBE14\uB85C\uADF8 \uC8FC\uC18C" }), _jsxs("div", { className: "input-prefix", children: [_jsx("span", { children: "devlog/@" }), _jsx("input", { value: body, lang: "en", inputMode: "url", autoCapitalize: "none", autoCorrect: "off", spellCheck: false, onChange: (e) => { setBody(cleanHandleInput(e.target.value)); setBodyTouched(true); setAutoFilled(false); }, maxLength: 20, autoComplete: "off", "aria-describedby": "handle-help", required: true })] }), _jsx("small", { id: "handle-help", className: errors.handleBody || handleCheck?.available === false ? 'error' : 'muted', children: errors.handleBody ?? (handleCheck == null ? '영문 소문자·숫자·_ 3~20자' : handleCheck.available ? '쓸 수 있는 주소예요.'
                                    : `${handleCheck.message}${handleCheck.suggestion ? ` "${handleCheck.suggestion}"는 어때요?` : ''}`) }), autoFilled && _jsx("small", { className: "muted", children: "\uC774\uBA54\uC77C \uC55E\uBD80\uBD84\uC73C\uB85C \uBBF8\uB9AC \uCC44\uC6E0\uC5B4\uC694. \uC774\uBA54\uC77C\uC744 \uB4DC\uB7EC\uB0B4\uACE0 \uC2F6\uC9C0 \uC54A\uC73C\uBA74 \uBC14\uAFD4 \uC8FC\uC138\uC694." }), _jsx("small", { className: "muted", children: "\uBE14\uB85C\uADF8 \uC8FC\uC18C\uB294 \uAC00\uC785 \uD6C4 \uBC14\uAFC0 \uC218 \uC5C6\uC5B4\uC694." }), handleCheck?.suggestion && !handleCheck.available && (_jsx("button", { type: "button", className: "btn btn-text", onClick: () => { setBody(handleCheck.suggestion); setBodyTouched(true); }, children: "\uCD94\uCC9C \uC8FC\uC18C \uC4F0\uAE30" }))] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), maxLength: 64, autoComplete: "new-password", "aria-describedby": "pw-rules", required: true }), _jsx(PasswordRules, { password: password, email: email, id: "pw-rules" }), errors.password && _jsx("small", { className: "error", children: errors.password })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uBE44\uBC00\uBC88\uD638 \uD655\uC778" }), _jsx("input", { type: "password", value: confirm, onChange: (e) => setConfirm(e.target.value), maxLength: 64, autoComplete: "new-password", required: true }), (errors.passwordConfirm || (confirm && confirm !== password)) && (_jsx("small", { className: "error", children: errors.passwordConfirm ?? '비밀번호가 서로 달라요.' }))] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uB2C9\uB124\uC784" }), _jsx("input", { value: nickname, onChange: (e) => setNickname(e.target.value), maxLength: 10, required: true }), _jsx("small", { className: errors.nickname || nickCheck?.available === false ? 'error' : 'muted', children: errors.nickname ?? (nickCheck == null ? '한글·영문·숫자 2~10자' : nickCheck.available ? '쓸 수 있는 닉네임이에요.' : nickCheck.message) })] }), _jsxs("fieldset", { className: "field agreements", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: agreeTerms && agreePrivacy, onChange: (e) => { setAgreeTerms(e.target.checked); setAgreePrivacy(e.target.checked); } }), " ", _jsx("b", { children: "\uBAA8\uB450 \uB3D9\uC758" })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: agreeTerms, onChange: (e) => setAgreeTerms(e.target.checked) }), " (\uD544\uC218) \uC774\uC6A9\uC57D\uAD00", terms ? ` (${terms.termsEffectiveDate} 시행)` : ''] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: agreePrivacy, onChange: (e) => setAgreePrivacy(e.target.checked) }), " (\uD544\uC218) \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uBC29\uCE68", terms ? ` (${terms.privacyEffectiveDate} 시행)` : ''] }), (errors.agreeTerms || errors.agreePrivacy) && _jsx("small", { className: "error", children: errors.agreeTerms ?? errors.agreePrivacy })] }), errors.form && _jsx("div", { className: "banner banner-warn", role: "alert", children: errors.form }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting || !ready, children: submitting ? '가입하는 중…' : '가입하기' }), _jsx("p", { className: "muted small", children: "\uAC00\uC785\uD558\uBA74 \uC778\uC99D \uBA54\uC77C\uC744 \uBCF4\uB0B4\uC694. \uBA54\uC77C\uC758 \uB9C1\uD06C\uB97C \uB20C\uB7EC\uC57C \uAE00\uC744 \uC4F8 \uC218 \uC788\uC5B4\uC694." })] }), _jsxs("p", { className: "auth-links small", children: ["\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uB098\uC694? ", _jsx(Link, { to: "/login", children: "\uB85C\uADF8\uC778" })] })] }));
}
