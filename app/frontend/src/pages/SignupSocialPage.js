import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { setFlash } from '../lib/flash';
import { copySocialAvatar, socialAvatarSource } from '../lib/image';
import { navigate } from '../lib/router';
/** 소셜 가입 마무리 (docs/08·09): 접두어 고정 + 본문 입력, 0.5초 뒤 중복 확인, 닉네임, 약관 동의. */
export function SignupSocialPage() {
    const { refresh } = useAuth();
    const [draft, setDraft] = useState(null);
    const [expired, setExpired] = useState(false);
    const [body, setBody] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [terms, setTerms] = useState(false);
    const [privacy, setPrivacy] = useState(false);
    const [usePhoto, setUsePhoto] = useState(true);
    const [photoBroken, setPhotoBroken] = useState(false);
    const [handleCheck, setHandleCheck] = useState(null);
    const [nickCheck, setNickCheck] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const timers = useRef({});
    useEffect(() => {
        api('/api/auth/signup').then((d) => {
            setDraft(d);
            setBody(d.handleBody);
            setNickname(d.nickname ?? '');
        }).catch(() => setExpired(true));
    }, []);
    useEffect(() => {
        if (!draft || !body)
            return setHandleCheck(null);
        clearTimeout(timers.current.h);
        timers.current.h = window.setTimeout(() => {
            api(`/api/handles/availability?handle=${encodeURIComponent(draft.prefix + body)}`).then(setHandleCheck).catch(() => setHandleCheck(null));
        }, 500);
    }, [body, draft]);
    useEffect(() => {
        if (!nickname)
            return setNickCheck(null);
        clearTimeout(timers.current.n);
        timers.current.n = window.setTimeout(() => {
            api(`/api/nicknames/availability?nickname=${encodeURIComponent(nickname)}`).then(setNickCheck).catch(() => setNickCheck(null));
        }, 500);
    }, [nickname]);
    if (expired) {
        return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uAC00\uC785 \uC2DC\uAC04\uC774 \uC9C0\uB0AC\uC5B4\uC694" }), _jsx("p", { className: "muted", children: "\uC18C\uC15C \uB85C\uADF8\uC778\uBD80\uD130 \uB2E4\uC2DC \uC2DC\uC791\uD574 \uC8FC\uC138\uC694." }), _jsx("a", { className: "btn btn-primary", href: "/login", children: "\uB85C\uADF8\uC778\uC73C\uB85C" })] }));
    }
    if (!draft)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    const providerName = draft.provider === 'GITHUB' ? 'GitHub' : 'Google';
    // 메일 인증 전에는 사진을 올릴 수 없어(005 FR-017) 이메일을 따로 받는 가입은 복사하지 않는다
    const photo = draft.emailRequired || photoBroken ? null : socialAvatarSource(draft.avatarUrl);
    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        try {
            const r = await api('/api/auth/signup', {
                method: 'POST', body: { handleBody: body, nickname, agreeTerms: terms, agreePrivacy: privacy, email: draft.emailRequired ? email : undefined },
            });
            if (photo && usePhoto && !(await copySocialAvatar(draft.avatarUrl))) {
                setFlash('소셜 사진을 가져오지 못했어요. 설정에서 직접 올릴 수 있어요.');
            }
            await refresh();
            navigate(r.redirect || '/', { replace: true });
        }
        catch (err) {
            if (err instanceof ApiError) {
                if (err.code === 'SIGNUP_EXPIRED')
                    return setExpired(true);
                const map = {};
                err.errors.forEach((f) => (map[f.field] = f.message));
                if (err.code === 'HANDLE_TAKEN') {
                    const s = err.details?.suggestion;
                    map.handleBody = `이미 쓰는 주소예요.${s ? ` "${s}"는 어때요?` : ''}`;
                }
                else if (err.code === 'NICKNAME_TAKEN')
                    map.nickname = err.message;
                else if (!err.errors.length)
                    map.form = err.message;
                setErrors(map);
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uAC00\uC785 \uB9C8\uBB34\uB9AC" }), _jsx("p", { className: "muted", children: "\uBE14\uB85C\uADF8 \uC8FC\uC18C\uB294 \uAC00\uC785 \uB4A4 \uBC14\uAFC0 \uC218 \uC5C6\uC5B4\uC694." }), _jsxs("form", { onSubmit: submit, className: "form", children: [draft.emailRequired && (_jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC774\uBA54\uC77C" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email", maxLength: 254, required: true }), _jsx("small", { className: errors.email ? 'error' : 'muted', children: errors.email ?? `${draft.provider === 'GITHUB' ? 'GitHub' : 'Google'} 계정에 인증된 이메일이 없어요. 받을 수 있는 이메일을 넣으면 인증 메일을 보내요.` })] })), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uBE14\uB85C\uADF8 \uC8FC\uC18C" }), _jsxs("div", { className: "input-prefix", children: [_jsxs("span", { children: ["devlog/@", draft.prefix] }), _jsx("input", { value: body, onChange: (e) => setBody(e.target.value.toLowerCase()), maxLength: 20, autoComplete: "off", spellCheck: false, "aria-describedby": "handle-help", required: true })] }), _jsx("small", { id: "handle-help", className: errors.handleBody || handleCheck?.available === false ? 'error' : 'muted', children: errors.handleBody ?? (handleCheck == null ? '영문 소문자·숫자·_ 3~20자' : handleCheck.available ? '쓸 수 있는 주소예요.'
                                    : `${handleCheck.message}${handleCheck.suggestion ? ` "${handleCheck.suggestion}"는 어때요?` : ''}`) }), handleCheck?.suggestion && !handleCheck.available && (_jsx("button", { type: "button", className: "btn btn-text", onClick: () => setBody(handleCheck.suggestion), children: "\uCD94\uCC9C \uC8FC\uC18C \uC4F0\uAE30" }))] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uB2C9\uB124\uC784" }), _jsx("input", { value: nickname, onChange: (e) => setNickname(e.target.value), maxLength: 10, required: true }), _jsx("small", { className: errors.nickname || nickCheck?.available === false ? 'error' : 'muted', children: errors.nickname ?? (nickCheck == null ? '2~10자' : nickCheck.available ? '쓸 수 있는 닉네임이에요.' : nickCheck.message) })] }), photo && (_jsxs("label", { className: "field social-photo", children: [_jsxs("span", { className: "row", children: [_jsx("input", { type: "checkbox", checked: usePhoto, onChange: (e) => setUsePhoto(e.target.checked) }), providerName, " \uD504\uB85C\uD544 \uC0AC\uC9C4 \uC0AC\uC6A9"] }), _jsx("img", { src: photo, alt: "", width: 64, height: 64, className: "avatar", referrerPolicy: "no-referrer", onError: () => setPhotoBroken(true) }), _jsx("small", { className: "muted", children: "\uAC00\uC785\uD560 \uB54C \uD55C \uBC88 \uBCF5\uC0AC\uD574 \uC640\uC694. \uB098\uC911\uC5D0 \uC124\uC815\uC5D0\uC11C \uBC14\uAFC0 \uC218 \uC788\uC5B4\uC694." })] })), _jsxs("fieldset", { className: "field agreements", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: terms && privacy, onChange: (e) => { setTerms(e.target.checked); setPrivacy(e.target.checked); } }), " ", _jsx("b", { children: "\uBAA8\uB450 \uB3D9\uC758" })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: terms, onChange: (e) => setTerms(e.target.checked) }), " (\uD544\uC218) \uC774\uC6A9\uC57D\uAD00 (", draft.terms.termsEffectiveDate, " \uC2DC\uD589)"] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: privacy, onChange: (e) => setPrivacy(e.target.checked) }), " (\uD544\uC218) \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uBC29\uCE68 (", draft.terms.privacyEffectiveDate, " \uC2DC\uD589)"] }), (errors.agreeTerms || errors.agreePrivacy) && _jsx("small", { className: "error", children: errors.agreeTerms ?? errors.agreePrivacy })] }), errors.form && _jsx("div", { className: "banner banner-warn", role: "alert", children: errors.form }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting || !terms || !privacy, children: submitting ? (photo && usePhoto ? '가입하고 사진을 가져오는 중…' : '가입하는 중…') : '가입하기' })] })] }));
}
