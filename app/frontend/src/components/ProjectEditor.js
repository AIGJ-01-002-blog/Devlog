import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { Link } from '../lib/router';
import { parseTech, portfolioApi, PROJECT_LIMITS } from '../lib/portfolio';
/**
 * 시리즈 주인의 [포트폴리오 프로젝트] (072 3단계). 켜면 이 시리즈가 포트폴리오에 프로젝트로 보이고,
 * 기간·한 줄 설명·기술·"우리 팀이 한 일"·"제 역할"을 적는다. 내가 맡지 않은 일은 "우리 팀이 한 일"에 적는다.
 */
export function ProjectEditor({ seriesId, handle }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(null);
    const [tech, setTech] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    useEffect(() => {
        if (!open || form)
            return;
        portfolioApi.project(seriesId).then((f) => { setForm(f); setTech(f.tech.join(', ')); }, () => setMessage({ ok: false, text: '프로젝트 정보를 불러오지 못했어요.' }));
    }, [open, form, seriesId]);
    const save = async () => {
        if (!form)
            return;
        setBusy(true);
        setMessage(null);
        try {
            const saved = await portfolioApi.save(seriesId, { ...form, tech: parseTech(tech) });
            setForm(saved);
            setTech(saved.tech.join(', '));
            setMessage({ ok: true, text: saved.portfolio ? '저장했어요. 포트폴리오에 프로젝트로 보여요.' : '저장했어요. 포트폴리오에는 보이지 않아요.' });
        }
        catch (e) {
            setMessage({ ok: false, text: e instanceof ApiError ? e.message : '저장하지 못했어요. 다시 시도해 주세요.' });
        }
        finally {
            setBusy(false);
        }
    };
    const set = (k) => (e) => setForm((f) => f && { ...f, [k]: e.target.value });
    return (_jsxs("details", { className: "project-editor", open: open, onToggle: (e) => setOpen(e.target.open), children: [_jsx("summary", { children: "\uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uD504\uB85C\uC81D\uD2B8" }), !form ? _jsx("p", { className: "muted small", children: message?.text ?? '불러오는 중…' }) : (_jsxs("form", { onSubmit: (e) => { e.preventDefault(); void save(); }, children: [_jsxs("label", { className: "check", children: [_jsx("input", { type: "checkbox", checked: form.portfolio, onChange: (e) => setForm({ ...form, portfolio: e.target.checked }) }), ' ', "\uD3EC\uD2B8\uD3F4\uB9AC\uC624\uC5D0 \uD504\uB85C\uC81D\uD2B8\uB85C \uBCF4\uC774\uAE30"] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uAE30\uAC04" }), _jsx("input", { value: form.period ?? '', maxLength: PROJECT_LIMITS.period, placeholder: "2026.03 ~ 2026.10", onChange: set('period') })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uD55C \uC904 \uC124\uBA85" }), _jsx("input", { value: form.summary ?? '', maxLength: PROJECT_LIMITS.summary, placeholder: "\uBB34\uC5C7\uC744 \uC65C \uB9CC\uB4E4\uC5C8\uB294\uC9C0 \uD55C \uC904\uB85C", onChange: set('summary') })] }), _jsxs("label", { className: "field", children: [_jsxs("span", { children: ["\uC4F4 \uAE30\uC220 (\uC27C\uD45C\uB85C \uB098\uB220\uC694, ", PROJECT_LIMITS.tech, "\uAC1C\uAE4C\uC9C0)"] }), _jsx("input", { value: tech, placeholder: "Spring Boot, React, PostgreSQL", onChange: (e) => setTech(e.target.value) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC6B0\uB9AC \uD300\uC774 \uD55C \uC77C" }), _jsx("textarea", { rows: 3, value: form.teamWork ?? '', maxLength: PROJECT_LIMITS.text, onChange: set('teamWork') })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uC81C \uC5ED\uD560 (\uB0B4\uAC00 \uB9E1\uC740 \uBD80\uBD84\uB9CC)" }), _jsx("textarea", { rows: 3, value: form.myRole ?? '', maxLength: PROJECT_LIMITS.text, onChange: set('myRole') })] }), _jsxs("div", { className: "row", children: [_jsx("button", { className: "btn btn-primary", disabled: busy, children: busy ? '저장 중…' : '저장' }), _jsx(Link, { to: `/@${handle}/portfolio`, className: "btn btn-text", "data-tip": "\uB0B4 \uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uD654\uBA74\uC744 \uC5F4\uC5B4\uC694", children: "\uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uBCF4\uAE30" })] }), message && _jsx("p", { className: message.ok ? 'muted small' : 'error small', role: message.ok ? 'status' : 'alert', children: message.text })] }))] }));
}
