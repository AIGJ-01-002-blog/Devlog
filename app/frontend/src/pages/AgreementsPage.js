import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fullDate } from '../lib/format';
import { PRIVACY_CHANGES, TERMS_CHANGES } from '../lib/agreementChanges';
import { navigate, useLocation } from '../lib/router';
// 시행일은 날짜만 온다(2026-10-01). 그대로 읽으면 UTC 자정이라 시간대에 따라 하루 밀리므로 그 지역의 자정으로 읽는다
const effective = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? fullDate(`${d}T00:00:00`) : d);
/** 약관·처리방침 버전이 바뀌었을 때의 재동의 (docs/07 §3-1). 동의 전에는 다른 요청이 막힌다. */
export function AgreementsPage() {
    const { search } = useLocation();
    const { refresh, logout } = useAuth();
    const [terms, setTerms] = useState(null);
    const [checked, setChecked] = useState(false);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        api('/api/terms/current').then(setTerms).catch(() => undefined);
    }, []);
    const agree = async () => {
        setBusy(true);
        setError(null);
        try {
            await api('/api/auth/agreements', { method: 'POST', body: { agreeTerms: true, agreePrivacy: true } });
            await refresh();
            const r = search.get('redirect') ?? '/';
            navigate(r.startsWith('/') && !r.startsWith('//') ? r : '/', { replace: true });
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : '처리하지 못했어요.');
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page", children: [_jsx("h1", { children: "\uC57D\uAD00\uC774 \uBC14\uB00C\uC5C8\uC5B4\uC694" }), _jsx("p", { className: "muted", children: "\uACC4\uC18D \uC4F0\uB824\uBA74 \uBC14\uB010 \uC774\uC6A9\uC57D\uAD00\uACFC \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uBC29\uCE68\uC5D0 \uB3D9\uC758\uD574 \uC8FC\uC138\uC694." }), terms && _jsxs("p", { className: "small", children: ["\uC774\uC6A9\uC57D\uAD00 ", effective(terms.termsEffectiveDate), " \uC2DC\uD589 \u00B7 \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uBC29\uCE68 ", effective(terms.privacyEffectiveDate), " \uC2DC\uD589"] }), terms && _jsx(ChangeList, { terms: terms }), _jsx("label", { className: "field", children: _jsxs("span", { children: [_jsx("input", { type: "checkbox", checked: checked, onChange: (e) => setChecked(e.target.checked) }), " \uBC14\uB010 \uC57D\uAD00\uACFC \uCC98\uB9AC\uBC29\uCE68\uC5D0 \uBAA8\uB450 \uB3D9\uC758\uD574\uC694"] }) }), error && _jsx("div", { className: "banner banner-warn", role: "alert", children: error }), _jsxs("div", { className: "row", children: [_jsx("button", { className: "btn btn-primary", disabled: !checked || busy, onClick: agree, children: busy ? '동의하는 중…' : '동의하고 계속하기' }), _jsx("button", { className: "btn btn-text", onClick: async () => { await logout(); navigate('/'); }, children: "\uB85C\uADF8\uC544\uC6C3" })] })] }));
}
/** 이번 버전에서 바뀐 것 (077). 본문 링크는 새 창으로 열어 동의 화면을 떠나지 않게 한다. */
function ChangeList({ terms }) {
    const items = [
        { doc: '이용약관', change: TERMS_CHANGES[terms.termsVersion] },
        { doc: '개인정보 처리방침', change: PRIVACY_CHANGES[terms.privacyVersion] },
    ].filter((i) => i.change);
    if (items.length === 0)
        return null;
    return (_jsxs("div", { className: "agreement-changes", children: [_jsx("h2", { children: "\uBC14\uB010 \uB0B4\uC6A9" }), _jsx("ul", { children: items.map(({ doc, change }) => (_jsxs("li", { children: [_jsx("b", { children: doc }), ": ", change.what, ' ', _jsx("a", { href: change.href, target: "_blank", rel: "noopener", title: "\uC0C8 \uCC3D\uC5D0\uC11C \uC5F4\uB824\uC694", children: "\uC804\uBB38 \uBCF4\uAE30" })] }, doc))) })] }));
}
