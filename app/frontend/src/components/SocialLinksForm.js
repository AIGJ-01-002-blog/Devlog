import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { fieldErrors } from '../lib/fieldErrors';
import { SOCIAL_FIELDS } from '../lib/socialLinks';
import { t } from '../lib/i18n';
const toDraft = (l) => Object.fromEntries(SOCIAL_FIELDS.map((f) => [f.kind, l[f.kind] ?? '']));
/** 설정의 소셜 정보 (spec 043). 다섯 칸을 한 번에 저장하고, 서버가 정리한 값(주소 → 아이디 등)으로 칸을 바꾼다. */
export function SocialLinksForm({ initial, onSaved }) {
    const [saved, setSavedLinks] = useState(() => toDraft(initial));
    const [draft, setDraft] = useState(saved);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const formRef = useRef(null);
    // 저장에 실패하면 첫 잘못된 칸으로 초점을 옮긴다
    useEffect(() => {
        formRef.current?.querySelector('input[aria-invalid="true"]')?.focus();
    }, [errors]);
    const dirty = SOCIAL_FIELDS.some((f) => draft[f.kind] !== saved[f.kind]);
    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setDone(false);
        try {
            const links = await api('/api/me/social-links', { method: 'PUT', body: draft });
            const next = toDraft(links);
            setSavedLinks(next);
            setDraft(next);
            setDone(true);
            onSaved(links);
        }
        catch (err) {
            setErrors(fieldErrors(err));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: t('소셜 정보') }), _jsx("p", { className: "muted small", children: t('블로그 머리에 링크로 보여요. 비워 두면 보이지 않아요.') }), _jsxs("form", { className: "form", ref: formRef, onSubmit: save, noValidate: true, children: [SOCIAL_FIELDS.map((f) => (_jsxs("label", { className: "field", children: [_jsx("span", { children: f.label }), _jsx("input", { name: f.kind, value: draft[f.kind], spellCheck: false, autoCapitalize: "none", autoCorrect: "off", placeholder: f.placeholder, maxLength: 254, type: f.kind === 'email' ? 'email' : f.kind === 'homepage' ? 'url' : 'text', autoComplete: f.kind === 'email' ? 'email' : f.kind === 'homepage' ? 'url' : 'off', "aria-invalid": errors[f.kind] ? true : undefined, "aria-describedby": errors[f.kind] ? `social-${f.kind}-error` : undefined, onChange: (e) => { setDraft({ ...draft, [f.kind]: e.target.value }); setDone(false); } }), errors[f.kind] && _jsx("small", { id: `social-${f.kind}-error`, className: "error", children: errors[f.kind] })] }, f.kind))), errors.form && _jsx("p", { className: "error", role: "alert", children: errors.form }), done && _jsx("p", { className: "ok", role: "status", children: t('저장했어요.') }), _jsx("div", { children: _jsx("button", { className: "btn btn-primary", disabled: busy || !dirty, children: busy ? t('저장하는 중…') : t('저장') }) })] })] }));
}
