import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../lib/api';
import { fieldErrors } from '../lib/fieldErrors';
import { SOCIAL_FIELDS } from '../lib/socialLinks';
const toDraft = (l) => Object.fromEntries(SOCIAL_FIELDS.map((f) => [f.kind, l[f.kind] ?? '']));
/** 설정의 소셜 정보 (spec 043). 다섯 칸을 한 번에 저장하고, 서버가 정리한 값(주소 → 아이디 등)으로 칸을 바꾼다. */
export function SocialLinksForm({ initial, onSaved }) {
    const [saved, setSavedLinks] = useState(() => toDraft(initial));
    const [draft, setDraft] = useState(saved);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
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
    return (_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "\uC18C\uC15C \uC815\uBCF4" }), _jsx("p", { className: "muted small", children: "\uBE14\uB85C\uADF8 \uBA38\uB9AC\uC5D0 \uB9C1\uD06C\uB85C \uBCF4\uC5EC\uC694. \uBE44\uC6CC \uB450\uBA74 \uBCF4\uC774\uC9C0 \uC54A\uC544\uC694." }), _jsxs("form", { className: "form", onSubmit: save, noValidate: true, children: [SOCIAL_FIELDS.map((f) => (_jsxs("label", { className: "field", children: [_jsx("span", { children: f.label }), _jsx("input", { value: draft[f.kind], placeholder: f.placeholder, maxLength: 254, type: f.kind === 'email' ? 'email' : f.kind === 'homepage' ? 'url' : 'text', autoComplete: f.kind === 'email' ? 'email' : f.kind === 'homepage' ? 'url' : 'off', "aria-invalid": errors[f.kind] ? true : undefined, "aria-describedby": errors[f.kind] ? `social-${f.kind}-error` : undefined, onChange: (e) => { setDraft({ ...draft, [f.kind]: e.target.value }); setDone(false); } }), errors[f.kind] && _jsx("small", { id: `social-${f.kind}-error`, className: "error", children: errors[f.kind] })] }, f.kind))), errors.form && _jsx("p", { className: "error", role: "alert", children: errors.form }), done && _jsx("p", { className: "ok", role: "status", children: "\uC800\uC7A5\uD588\uC5B4\uC694." }), _jsx("div", { children: _jsx("button", { className: "btn btn-primary", disabled: busy || !dirty, children: busy ? '저장하는 중…' : '저장' }) })] })] }));
}
