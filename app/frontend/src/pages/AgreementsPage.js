import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { navigate, useLocation } from '../lib/router';
/** 약관·처리방침 버전이 바뀌었을 때의 재동의 (docs/07 §3-1). 동의 전에는 다른 요청이 막힌다. */
export function AgreementsPage() {
    const { search } = useLocation();
    const { refresh, logout } = useAuth();
    const [terms, setTerms] = useState(null);
    const [checked, setChecked] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        api('/api/terms/current').then(setTerms).catch(() => undefined);
    }, []);
    const agree = async () => {
        try {
            await api('/api/auth/agreements', { method: 'POST', body: { agreeTerms: true, agreePrivacy: true } });
            await refresh();
            const r = search.get('redirect') ?? '/';
            navigate(r.startsWith('/') && !r.startsWith('//') ? r : '/', { replace: true });
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : '처리하지 못했어요.');
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uC57D\uAD00\uC774 \uBC14\uB00C\uC5C8\uC5B4\uC694" }), _jsx("p", { className: "muted", children: "\uACC4\uC18D \uC4F0\uB824\uBA74 \uBC14\uB010 \uC774\uC6A9\uC57D\uAD00\uACFC \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uBC29\uCE68\uC5D0 \uB3D9\uC758\uD574 \uC8FC\uC138\uC694." }), terms && _jsxs("p", { className: "small", children: ["\uC774\uC6A9\uC57D\uAD00 ", terms.termsEffectiveDate, " \uC2DC\uD589 \u00B7 \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uBC29\uCE68 ", terms.privacyEffectiveDate, " \uC2DC\uD589"] }), _jsx("label", { className: "field", children: _jsxs("span", { children: [_jsx("input", { type: "checkbox", checked: checked, onChange: (e) => setChecked(e.target.checked) }), " \uBC14\uB010 \uC57D\uAD00\uACFC \uCC98\uB9AC\uBC29\uCE68\uC5D0 \uBAA8\uB450 \uB3D9\uC758\uD574\uC694"] }) }), error && _jsx("div", { className: "banner banner-warn", role: "alert", children: error }), _jsxs("div", { className: "row", children: [_jsx("button", { className: "btn btn-primary", disabled: !checked, onClick: agree, children: "\uB3D9\uC758\uD558\uACE0 \uACC4\uC18D\uD558\uAE30" }), _jsx("button", { className: "btn btn-text", onClick: async () => { await logout(); navigate('/'); }, children: "\uB85C\uADF8\uC544\uC6C3" })] })] }));
}
