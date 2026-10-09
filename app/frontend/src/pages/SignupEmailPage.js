import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { PasswordRules } from '../components/PasswordRules';
import { SignupAgreements } from '../components/SignupAgreements';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fieldErrors } from '../lib/fieldErrors';
import { cleanHandleInput, passwordOk } from '../lib/password';
import { Link, navigate, useLocation } from '../lib/router';
const RESEND_SECONDS = 60;
const normEmail = (v) => v.trim().toLowerCase();
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
/**
 * 이메일 가입 (004 US1, docs/08 §3): 이메일을 치는 동안 주소를 미리 채우고, 주소를 직접 고치면 더는 바꾸지 않는다.
 * 비밀번호는 규칙별 ✓로 보여 주고, 최종 검사는 서버가 한다.
 * 아이디(이메일)는 치는 동안 가입 여부를 확인하고, [인증]으로 받은 6자리 번호를 이 화면에서 넣어 인증한다 (spec 065).
 * 아이디 사용 가능·블로그 주소 사용 가능·이메일 인증이 모두 끝나야 가입 버튼이 켜진다.
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
    const [agreed, setAgreed] = useState({ terms: false, privacy: false, ai: false });
    const [handleCheck, setHandleCheck] = useState(null);
    const [nickCheck, setNickCheck] = useState(null);
    const [errors, setErrors] = useState({});
    const [emailTaken, setEmailTaken] = useState(false);
    const [withdrawnAccount, setWithdrawnAccount] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [codeRequired, setCodeRequired] = useState(false);
    const [emailCheck, setEmailCheck] = useState(null);
    const [code, setCode] = useState('');
    const [sentTo, setSentTo] = useState(null);
    const [expiresAt, setExpiresAt] = useState(0);
    const [resendAt, setResendAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [verifiedEmail, setVerifiedEmail] = useState(null);
    const [codeMsg, setCodeMsg] = useState(null);
    const [sending, setSending] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const timers = useRef({});
    useEffect(() => {
        if (me?.authenticated)
            navigate('/', { replace: true });
    }, [me]);
    useEffect(() => {
        api('/api/terms/current').then(setTermsInfo).catch(() => undefined);
        api('/api/auth/providers').then((r) => setCodeRequired(!!r.emailCode)).catch(() => undefined);
    }, []);
    // 아이디(이메일) 확인: 형식과 가입 여부
    useEffect(() => {
        const e = normEmail(email);
        clearTimeout(timers.current.e);
        if (!e)
            return setEmailCheck(null);
        timers.current.e = window.setTimeout(() => {
            api(`/api/emails/availability?email=${encodeURIComponent(e)}`).then(setEmailCheck).catch(() => setEmailCheck(null));
        }, 500);
    }, [email]);
    // 인증번호 남은 시간·다시 보내기 대기 시간 표시
    useEffect(() => {
        if (!sentTo || verifiedEmail)
            return;
        const t = window.setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [sentTo, verifiedEmail]);
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
    const verified = !!verifiedEmail && verifiedEmail === normEmail(email);
    const codeOpen = !!sentTo && sentTo === normEmail(email) && !verified;
    const resendLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
    const expireLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const sendCode = async () => {
        const target = normEmail(email);
        setSending(true);
        setCodeMsg(null);
        setEmailTaken(false);
        setWithdrawnAccount(false);
        try {
            const r = await api('/api/auth/signup/email-code', { method: 'POST', body: { email: target } });
            const t = Date.now();
            setSentTo(target);
            setCode('');
            setNow(t);
            setExpiresAt(t + r.expiresInSeconds * 1000);
            setResendAt(t + RESEND_SECONDS * 1000);
            setCodeMsg({ text: '인증번호를 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.', error: false });
        }
        catch (err) {
            if (err instanceof ApiError && err.code === 'EMAIL_TAKEN')
                setEmailTaken(true);
            else if (err instanceof ApiError && err.code === 'WITHDRAWN_ACCOUNT')
                setWithdrawnAccount(true);
            else
                setCodeMsg({ text: err instanceof ApiError ? err.message : '인증번호를 보내지 못했어요.', error: true });
        }
        finally {
            setSending(false);
        }
    };
    const confirmCode = async () => {
        setConfirming(true);
        try {
            const r = await api('/api/auth/signup/email-code/verify', { method: 'POST', body: { email: sentTo, code } });
            setVerifiedEmail(r.email);
            setCodeMsg(null);
            setErrors((prev) => { const { email: _drop, ...rest } = prev; return rest; });
        }
        catch (err) {
            if (err instanceof ApiError && (err.code === 'CODE_EXPIRED' || err.code === 'CODE_TOO_MANY_TRIES'))
                setResendAt(0);
            setCodeMsg({ text: err instanceof ApiError ? err.message : '인증하지 못했어요.', error: true });
        }
        finally {
            setConfirming(false);
        }
    };
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
                body: { email, handleBody: body, password, passwordConfirm: confirm, nickname, agreeTerms: agreed.terms, agreePrivacy: agreed.privacy, agreeAi: agreed.ai },
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
    const emailUsable = emailCheck?.available === true;
    const ready = agreed.terms && agreed.privacy && passwordOk(password, email) && password === confirm && body.length >= 3
        && handleCheck?.available === true && emailUsable && (!codeRequired || verified);
    const emailHelp = errors.email ?? (emailTaken || withdrawnAccount ? null
        : emailCheck == null ? '로그인할 때 쓰는 아이디예요.'
            : emailCheck.available ? (verified ? '인증을 마쳤어요.' : codeOpen ? '쓸 수 있는 아이디예요. 메일로 받은 인증번호를 넣어 주세요.'
                : codeRequired ? '쓸 수 있는 아이디예요. [인증]을 눌러 인증번호를 받아 주세요.' : '쓸 수 있는 아이디예요.')
                : emailCheck.message);
    const sendLabel = verified ? '인증됨' : sending ? '보내는 중…' : codeOpen && resendLeft > 0 ? `다시 보내기 ${resendLeft}초` : codeOpen ? '다시 보내기' : '인증';
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uC774\uBA54\uC77C\uB85C \uAC00\uC785" }), _jsxs("form", { onSubmit: submit, className: "form", noValidate: true, children: [_jsxs("div", { className: "field", children: [_jsx("span", { id: "signup-email-label", children: "\uC544\uC774\uB514(\uC774\uBA54\uC77C)" }), _jsxs("div", { className: "input-action", children: [_jsx("input", { id: "signup-email", "aria-labelledby": "signup-email-label", type: "email", value: email, onChange: (e) => { setEmail(e.target.value); setEmailTaken(false); setWithdrawnAccount(false); }, maxLength: 254, autoComplete: "email", spellCheck: false, autoCapitalize: "none", required: true, "aria-describedby": "email-help", "aria-invalid": !!errors.email || emailTaken || withdrawnAccount || emailCheck?.available === false }), codeRequired && (_jsxs("button", { type: "button", className: verified ? 'btn btn-outline ok' : 'btn btn-outline', onClick: sendCode, disabled: verified || sending || !emailUsable || (codeOpen && resendLeft > 0), title: verified ? '이 이메일은 인증을 마쳤어요' : codeOpen ? '인증번호를 새로 보내요. 앞서 보낸 번호는 쓸 수 없게 돼요'
                                            : '아이디를 확인하고 이 이메일로 6자리 인증번호를 보내요', children: [verified ? '✓ ' : '', sendLabel] }))] }), emailHelp && (_jsx("small", { id: "email-help", "aria-live": "polite", className: errors.email || emailCheck?.available === false ? 'error' : verified ? 'ok' : 'muted', children: emailHelp })), codeOpen && (_jsxs("div", { className: "input-action", children: [_jsx("input", { "aria-label": "\uC778\uC99D\uBC88\uD638 6\uC790\uB9AC", value: code, inputMode: "numeric", autoComplete: "one-time-code", maxLength: 6, spellCheck: false, placeholder: "\uC778\uC99D\uBC88\uD638 6\uC790\uB9AC", onChange: (e) => setCode(e.target.value.replace(/\D/g, '')), onKeyDown: (e) => { if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (code.length === 6)
                                                void confirmCode();
                                        } } }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: confirmCode, disabled: confirming || code.length !== 6 || expireLeft === 0, title: "\uBC1B\uC740 \uC778\uC99D\uBC88\uD638\uAC00 \uB9DE\uB294\uC9C0 \uD655\uC778\uD574\uC694", children: confirming ? '확인 중…' : '확인' })] })), codeOpen && expireLeft > 0 && _jsxs("small", { className: "muted", children: [mmss(expireLeft), " \uC548\uC5D0 \uB123\uC5B4 \uC8FC\uC138\uC694."] }), codeOpen && expireLeft === 0 && !codeMsg?.error && _jsx("small", { className: "error", children: "\uC778\uC99D\uBC88\uD638\uAC00 \uB9CC\uB8CC\uB410\uC5B4\uC694. \uB2E4\uC2DC \uBCF4\uB0B4\uAE30\uB97C \uB20C\uB7EC \uC8FC\uC138\uC694." }), codeMsg && !verified && _jsx("small", { className: codeMsg.error ? 'error' : 'muted', role: codeMsg.error ? 'alert' : undefined, children: codeMsg.text }), withdrawnAccount && (_jsxs("div", { className: "banner banner-warn", role: "alert", children: ["\uD0C8\uD1F4 \uC2E0\uCCAD\uD55C \uACC4\uC815\uC774 \uC788\uC5B4\uC694. \uB85C\uADF8\uC778\uD558\uBA74 \uBCF5\uAD6C\uD560 \uC218 \uC788\uC5B4\uC694.", _jsx("div", { className: "banner-actions", children: _jsx(Link, { to: "/login", className: "btn btn-outline", children: "\uB85C\uADF8\uC778" }) })] })), emailTaken && (_jsxs("div", { className: "banner banner-warn", role: "alert", children: ["\uC774\uBBF8 \uAC00\uC785\uB41C \uC774\uBA54\uC77C\uC774\uC5D0\uC694.", _jsxs("div", { className: "banner-actions", children: [_jsx(Link, { to: "/login", className: "btn btn-outline", children: "\uB85C\uADF8\uC778" }), _jsx(Link, { to: "/forgot-password", className: "btn btn-outline", children: "\uBE44\uBC00\uBC88\uD638 \uCC3E\uAE30" })] })] }))] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uBE14\uB85C\uADF8 \uC8FC\uC18C" }), _jsxs("div", { className: "input-prefix", children: [_jsx("span", { children: "devlog/@" }), _jsx("input", { value: body, lang: "en", inputMode: "url", autoCapitalize: "none", autoCorrect: "off", spellCheck: false, onChange: (e) => { setBody(cleanHandleInput(e.target.value)); setBodyTouched(true); setAutoFilled(false); }, maxLength: 20, autoComplete: "off", "aria-describedby": "handle-help", required: true })] }), _jsx("small", { id: "handle-help", "aria-live": "polite", className: errors.handleBody || handleCheck?.available === false ? 'error' : 'muted', children: errors.handleBody ?? (handleCheck == null ? '영문 소문자·숫자·_ 3~20자' : handleCheck.available ? '쓸 수 있는 주소예요.'
                                    : `${handleCheck.message}${handleCheck.suggestion ? ` "${handleCheck.suggestion}"는 어때요?` : ''}`) }), autoFilled && _jsx("small", { className: "muted", children: "\uC774\uBA54\uC77C \uC55E\uBD80\uBD84\uC73C\uB85C \uBBF8\uB9AC \uCC44\uC6E0\uC5B4\uC694. \uC774\uBA54\uC77C\uC744 \uB4DC\uB7EC\uB0B4\uACE0 \uC2F6\uC9C0 \uC54A\uC73C\uBA74 \uBC14\uAFD4 \uC8FC\uC138\uC694." }), _jsx("small", { className: "muted", children: "\uBE14\uB85C\uADF8 \uC8FC\uC18C\uB294 \uAC00\uC785 \uD6C4 \uBC14\uAFC0 \uC218 \uC5C6\uC5B4\uC694." }), handleCheck?.suggestion && !handleCheck.available && (_jsx("button", { type: "button", className: "btn btn-text", onClick: () => { setBody(handleCheck.suggestion); setBodyTouched(true); }, children: "\uCD94\uCC9C \uC8FC\uC18C \uC4F0\uAE30" }))] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), maxLength: 64, autoComplete: "new-password", "aria-describedby": "pw-rules", required: true }), _jsx(PasswordRules, { password: password, email: email, id: "pw-rules" }), errors.password && _jsx("small", { className: "error", children: errors.password })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uBE44\uBC00\uBC88\uD638 \uD655\uC778" }), _jsx("input", { type: "password", value: confirm, onChange: (e) => setConfirm(e.target.value), maxLength: 64, autoComplete: "new-password", required: true }), (errors.passwordConfirm || (confirm && confirm !== password)) && (_jsx("small", { className: "error", children: errors.passwordConfirm ?? '비밀번호가 서로 달라요.' }))] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uB2C9\uB124\uC784" }), _jsx("input", { value: nickname, onChange: (e) => setNickname(e.target.value), maxLength: 10, required: true, autoComplete: "nickname", "aria-describedby": "nickname-help", "aria-invalid": !!errors.nickname || nickCheck?.available === false }), _jsx("small", { id: "nickname-help", "aria-live": "polite", className: errors.nickname || nickCheck?.available === false ? 'error' : 'muted', children: errors.nickname ?? (nickCheck == null ? '한글·영문·숫자 2~10자' : nickCheck.available ? '쓸 수 있는 닉네임이에요.' : nickCheck.message) })] }), _jsx(SignupAgreements, { value: agreed, onChange: setAgreed, termsDate: terms?.termsEffectiveDate, privacyDate: terms?.privacyEffectiveDate, error: errors.agreeTerms ?? errors.agreePrivacy }), errors.form && _jsx("div", { className: "banner banner-warn", role: "alert", children: errors.form }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting || !ready, children: submitting ? '가입하는 중…' : '가입하기' }), !ready && !submitting && (_jsx("p", { className: "muted small", children: codeRequired && !verified ? '아이디 확인과 이메일 인증을 마치면 가입할 수 있어요.' : '빠진 항목을 채우면 가입할 수 있어요.' })), !codeRequired && _jsx("p", { className: "muted small", children: "\uAC00\uC785\uD558\uBA74 \uC778\uC99D \uBA54\uC77C\uC744 \uBCF4\uB0B4\uC694. \uBA54\uC77C\uC758 \uB9C1\uD06C\uB97C \uB20C\uB7EC\uC57C \uAE00\uC744 \uC4F8 \uC218 \uC788\uC5B4\uC694." })] }), _jsxs("p", { className: "auth-links small", children: ["\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uB098\uC694? ", _jsx(Link, { to: "/login", children: "\uB85C\uADF8\uC778" })] })] }));
}
