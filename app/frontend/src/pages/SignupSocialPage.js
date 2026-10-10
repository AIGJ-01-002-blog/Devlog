import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { SignupAgreements } from '../components/SignupAgreements';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { setFlash } from '../lib/flash';
import { copySocialAvatar, socialAvatarSource } from '../lib/image';
import { navigate } from '../lib/router';
import { t } from '../lib/i18n';
/** 소셜 가입 마무리 (docs/08·09): 접두어 고정 + 본문 입력, 0.5초 뒤 중복 확인, 닉네임, 약관 동의. */
const PROVIDER_NAMES = { GITHUB: 'GitHub', GOOGLE: 'Google', KAKAO: t('카카오') };
export function SignupSocialPage() {
    const { refresh } = useAuth();
    const [draft, setDraft] = useState(null);
    const [expired, setExpired] = useState(false);
    const [body, setBody] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [agreed, setAgreed] = useState({ terms: false, privacy: false, ai: false });
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
        return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: t('가입 시간이 지났어요') }), _jsx("p", { className: "muted", children: t('소셜 로그인부터 다시 시작해 주세요.') }), _jsx("a", { className: "btn btn-primary", href: "/login", children: t('로그인으로') })] }));
    }
    if (!draft)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: t('불러오는 중…') }) });
    const providerName = PROVIDER_NAMES[draft.provider] ?? draft.provider;
    // 메일 인증 전에는 사진을 올릴 수 없어(005 FR-017) 이메일을 따로 받는 가입은 복사하지 않는다
    const photo = draft.emailRequired || photoBroken ? null : socialAvatarSource(draft.avatarUrl);
    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        try {
            const r = await api('/api/auth/signup', {
                method: 'POST', body: { handleBody: body, nickname, agreeTerms: agreed.terms, agreePrivacy: agreed.privacy, agreeAi: agreed.ai, email: draft.emailRequired ? email : undefined },
            });
            if (photo && usePhoto && !(await copySocialAvatar(draft.avatarUrl))) {
                setFlash(t('소셜 사진을 가져오지 못했어요. 설정에서 직접 올릴 수 있어요.'));
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
                    map.handleBody = (s ? t('이미 쓰는 주소예요. "{0}"는 어때요?', { 0: s }) : t('이미 쓰는 주소예요.'));
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
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: t('가입 마무리') }), _jsx("p", { className: "muted", children: t('블로그 주소는 가입 뒤 바꿀 수 없어요.') }), _jsxs("form", { onSubmit: submit, className: "form", children: [draft.emailRequired && (_jsxs("label", { className: "field", children: [_jsx("span", { children: t('이메일') }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email", maxLength: 254, required: true, spellCheck: false, autoCapitalize: "none", "aria-describedby": "email-help", "aria-invalid": !!errors.email }), _jsx("small", { id: "email-help", className: errors.email ? 'error' : 'muted', children: errors.email ?? t('{0} 계정에 인증된 이메일이 없어요. 받을 수 있는 이메일을 넣으면 인증 메일을 보내요.', { 0: providerName }) })] })), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('블로그 주소') }), _jsxs("div", { className: "input-prefix", children: [_jsxs("span", { children: ["devlog/@", draft.prefix] }), _jsx("input", { value: body, onChange: (e) => setBody(e.target.value.toLowerCase()), maxLength: 20, autoComplete: "off", autoCapitalize: "none", autoCorrect: "off", spellCheck: false, "aria-describedby": "handle-help", required: true })] }), _jsx("small", { id: "handle-help", "aria-live": "polite", className: errors.handleBody || handleCheck?.available === false ? 'error' : 'muted', children: errors.handleBody ?? (handleCheck == null ? t('영문 소문자·숫자·_ 3~20자') : handleCheck.available ? t('쓸 수 있는 주소예요.')
                                    : `${handleCheck.message}${handleCheck.suggestion ? t(' "{0}"는 어때요?', { 0: handleCheck.suggestion }) : ''}`) }), handleCheck?.suggestion && !handleCheck.available && (_jsx("button", { type: "button", className: "btn btn-text", onClick: () => setBody(handleCheck.suggestion), children: t('추천 주소 쓰기') }))] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: t('닉네임') }), _jsx("input", { value: nickname, onChange: (e) => setNickname(e.target.value), maxLength: 10, required: true, autoComplete: "nickname", "aria-describedby": "nickname-help", "aria-invalid": !!errors.nickname || nickCheck?.available === false }), _jsx("small", { id: "nickname-help", "aria-live": "polite", className: errors.nickname || nickCheck?.available === false ? 'error' : 'muted', children: errors.nickname ?? (nickCheck == null ? t('2~10자') : nickCheck.available ? t('쓸 수 있는 닉네임이에요.') : nickCheck.message) })] }), photo && (_jsxs("label", { className: "field social-photo", children: [_jsxs("span", { className: "row", children: [_jsx("input", { type: "checkbox", checked: usePhoto, onChange: (e) => setUsePhoto(e.target.checked) }), providerName, "  ", t('프로필 사진 사용')] }), _jsx("img", { src: photo, alt: "", width: 64, height: 64, className: "avatar", referrerPolicy: "no-referrer", onError: () => setPhotoBroken(true) }), _jsx("small", { className: "muted", children: t('가입할 때 한 번 복사해 와요. 나중에 설정에서 바꿀 수 있어요.') })] })), _jsx(SignupAgreements, { value: agreed, onChange: setAgreed, termsDate: draft.terms.termsEffectiveDate, privacyDate: draft.terms.privacyEffectiveDate, error: errors.agreeTerms ?? errors.agreePrivacy }), errors.form && _jsx("div", { className: "banner banner-warn", role: "alert", children: errors.form }), _jsx("button", { className: "btn btn-primary btn-block", disabled: submitting || !agreed.terms || !agreed.privacy, children: submitting ? (photo && usePhoto ? t('가입하고 사진을 가져오는 중…') : t('가입하는 중…')) : t('가입하기') })] })] }));
}
