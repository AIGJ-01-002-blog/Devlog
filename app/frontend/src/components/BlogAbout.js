import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { enhanceGifs } from '../lib/gifPlayer';
import { highlightWithin } from '../lib/highlight';
import { setLeaveGuard } from '../lib/router';
/** 서버와 같은 길이 제한 (spec 042 FR-002) */
export const ABOUT_MAX = 10_000;
export const aboutApi = {
    of: (handle) => api(`/api/members/${encodeURIComponent(handle)}/about`),
    save: (contentMd) => api('/api/me/about', { method: 'PUT', body: { contentMd } }),
};
/** 블로그 [소개] 탭 (spec 042, velog 소개). 본인은 그 자리에서 마크다운으로 고친다. */
export function BlogAbout({ handle }) {
    const [about, setAbout] = useState(null);
    const [failed, setFailed] = useState(false);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const bodyRef = useRef(null);
    const editorRef = useRef(null);
    useEffect(() => {
        let alive = true;
        aboutApi.of(handle).then((a) => { if (alive)
            setAbout(a); }).catch(() => { if (alive)
            setFailed(true); });
        return () => { alive = false; };
    }, [handle]);
    useEffect(() => {
        if (draft == null && about?.html) {
            void highlightWithin(bodyRef.current);
            enhanceGifs(bodyRef.current);
        }
    }, [about, draft]);
    const editing = draft != null;
    useEffect(() => { if (editing)
        editorRef.current?.focus(); }, [editing]);
    const dirty = draft != null && draft !== (about?.contentMd ?? '');
    // 고치던 소개가 있으면 탭을 닫거나 새로 고칠 때, 앱 안에서 다른 화면으로 갈 때 한 번 묻는다
    useEffect(() => {
        if (!dirty)
            return;
        const guard = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', guard);
        setLeaveGuard(() => confirm('작성 중인 소개를 버릴까요?'));
        return () => {
            window.removeEventListener('beforeunload', guard);
            setLeaveGuard(null);
        };
    }, [dirty]);
    if (failed)
        return _jsx("p", { className: "muted center", children: "\uC18C\uAC1C\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694." });
    if (!about)
        return _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" });
    const save = async () => {
        if (draft == null)
            return;
        setSaving(true);
        setError(null);
        try {
            await aboutApi.save(draft);
            setAbout(await aboutApi.of(handle));
            setDraft(null);
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
        finally {
            setSaving(false);
        }
    };
    if (draft != null) {
        const length = [...draft].length;
        return (_jsxs("section", { className: "blog-about", "aria-label": "\uC18C\uAC1C \uC218\uC815", children: [_jsx("label", { htmlFor: "about-editor", className: "sr-only", children: "\uBE14\uB85C\uADF8 \uC18C\uAC1C (\uB9C8\uD06C\uB2E4\uC6B4)" }), _jsx("textarea", { id: "about-editor", ref: editorRef, className: "about-editor", value: draft, rows: 14, "aria-describedby": "about-count", placeholder: "\uB098\uB97C \uC18C\uAC1C\uD558\uB294 \uAE00\uC744 \uB9C8\uD06C\uB2E4\uC6B4\uC73C\uB85C \uC368 \uBCF4\uC138\uC694.", onChange: (e) => setDraft(e.target.value) }), _jsxs("div", { className: "row about-actions", children: [_jsxs("span", { id: "about-count", className: `muted small${length > ABOUT_MAX ? ' danger' : ''}`, children: [length.toLocaleString(), " / ", ABOUT_MAX.toLocaleString(), "\uC790"] }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => {
                                if (dirty && !confirm('작성 중인 소개를 버릴까요?'))
                                    return;
                                setDraft(null);
                                setError(null);
                            }, disabled: saving, children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: save, disabled: saving || length > ABOUT_MAX, children: saving ? '저장 중…' : '저장' })] }), error && _jsx("p", { className: "error", role: "alert", children: error })] }));
    }
    return (_jsxs("section", { className: "blog-about", children: [about.html
                ? _jsx("div", { className: "markdown", ref: bodyRef, dangerouslySetInnerHTML: { __html: about.html } })
                : _jsx("p", { className: "muted center", children: about.mine ? '아직 블로그 소개가 없어요.' : '소개가 없어요.' }), about.mine && (_jsx("div", { className: "row about-actions", children: _jsx("button", { type: "button", className: "btn btn-outline", onClick: () => setDraft(about.contentMd ?? ''), children: about.html ? '소개 수정' : '소개 쓰기' }) }))] }));
}
