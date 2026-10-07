import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useState } from 'react';
import { clearLocalData, useAuth } from '../lib/auth';
import { navigate } from '../lib/router';
import { CONFIRM_TEXT, deadline, withdrawApi, withdrawErrorText, withdrawReady } from '../lib/withdraw';
/**
 * 회원 탈퇴 (020 US1): 한 화면에 ① 잃게 되는 것과 확인 체크 → ② 본인 확인 → [탈퇴하기].
 * 탈퇴 사유는 묻지 않는다(FR-004). [탈퇴하기]는 빨간색이지만 처음 초점을 받지 않는다(FR-005).
 */
export function WithdrawPage() {
    const { me, refresh } = useAuth();
    const [s, setS] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [checked, setChecked] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const checkId = useId();
    useEffect(() => {
        document.title = '회원 탈퇴 - devlog';
        withdrawApi.summary().then(setS).catch(() => setLoadError(true));
    }, []);
    if (loadError)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "error center", children: "\uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC0C8\uB85C\uACE0\uCE68\uD574 \uC8FC\uC138\uC694." }) });
    if (!s)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    const ready = withdrawReady(s.method, checked, password, confirmText);
    const submit = async (e) => {
        e.preventDefault();
        if (!ready || busy)
            return;
        setBusy(true);
        setError(null);
        try {
            const r = await withdrawApi.withdraw(s.method === 'PASSWORD' ? password : null, s.method === 'CONFIRM_TEXT' ? confirmText : null);
            // 서버가 모든 기기의 세션을 지웠다. 로그인 필요 화면이 로그인으로 보내기 전에 완료 화면으로 먼저 옮기고,
            // 이 브라우저의 임시 글 데이터도 로그아웃처럼 지운다 (FR-014)
            const id = me?.member?.id;
            navigate(`/withdrawn?until=${encodeURIComponent(r.restoreBy)}`, { replace: true });
            await clearLocalData(id);
            await refresh();
        }
        catch (err) {
            setError(withdrawErrorText(err));
            setBusy(false);
        }
    };
    return (_jsxs("main", { className: "container narrow withdraw-page", children: [_jsx("h1", { className: "page-title", children: "\uD68C\uC6D0 \uD0C8\uD1F4" }), s.admin && _jsx("div", { className: "banner banner-warn", role: "alert", children: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC744 \uD574\uC81C\uD55C \uB4A4 \uD0C8\uD1F4\uD560 \uC218 \uC788\uC5B4\uC694." }), _jsxs("form", { onSubmit: submit, noValidate: true, children: [_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "\u2460 \uD0C8\uD1F4\uD558\uBA74 \uC774\uB807\uAC8C \uB3FC\uC694" }), _jsxs("ul", { className: "withdraw-facts", children: [_jsxs("li", { children: ["\uBE14\uB85C\uADF8 ", _jsxs("b", { children: ["@", s.handle] }), "\uC640 \uAE00 ", _jsxs("b", { children: [s.posts, "\uAC1C"] }), "\uAC00 \uBC14\uB85C \uB2E4\uB978 \uC0AC\uB78C\uC5D0\uAC8C \uBCF4\uC774\uC9C0 \uC54A\uC544\uC694."] }), _jsxs("li", { children: ["\uB0A8\uC758 \uAE00\uC5D0 \uC4F4 \uB313\uAE00 ", _jsxs("b", { children: [s.comments, "\uAC1C"] }), "\uB294 \"\uD0C8\uD1F4\uD55C \uC0AC\uC6A9\uC790\uC758 \uB313\uAE00\uC774\uC5D0\uC694\"\uB85C \uAC00\uB824\uC838\uC694."] }), _jsxs("li", { children: [_jsx("b", { children: deadline(s.restoreBy) }), "\uAE4C\uC9C0 \uB2E4\uC2DC \uB85C\uADF8\uC778\uD558\uBA74 \uBAA8\uB450 \uBCF5\uAD6C\uD560 \uC218 \uC788\uC5B4\uC694."] }), _jsxs("li", { children: ["30\uC77C\uC774 \uC9C0\uB098\uBA74 \uAE00\u00B7\uC0AC\uC9C4\u00B7\uBC1B\uC740 \uC88B\uC544\uC694 ", _jsxs("b", { children: [s.likesReceived, "\uAC1C"] }), "\uAC00 \uC644\uC804\uD788 \uC0AD\uC81C\uB418\uC5B4 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC5B4\uC694. \uB2F5\uAE00\uC774 \uB2EC\uB9B0 \uB313\uAE00\uC740 \uB0B4\uC6A9 \uC5C6\uC774 \uC790\uB9AC\uB9CC \uB0A8\uC544\uC694."] }), _jsxs("li", { children: ["\uBE14\uB85C\uADF8 \uC8FC\uC18C ", _jsxs("b", { children: ["@", s.handle] }), "\uB294 \uB2E4\uB978 \uC0AC\uB78C\uB3C4, \uB098\uB3C4 \uB2E4\uC2DC \uC4F8 \uC218 \uC5C6\uC5B4\uC694."] })] }), _jsxs("label", { className: "check", htmlFor: checkId, children: [_jsx("input", { id: checkId, type: "checkbox", checked: checked, onChange: (e) => setChecked(e.target.checked) }), " \uC704 \uB0B4\uC6A9\uC744 \uD655\uC778\uD588\uC5B4\uC694"] })] }), _jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: "\u2461 \uBCF8\uC778 \uD655\uC778" }), s.method === 'PASSWORD' ? (_jsxs("label", { className: "field", children: [_jsx("span", { children: "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", value: password, maxLength: 64, autoComplete: "current-password", onChange: (e) => { setPassword(e.target.value); setError(null); }, "aria-invalid": error?.field === 'password' }), error?.field === 'password' && _jsx("small", { className: "error", children: error.text })] })) : (_jsxs("label", { className: "field", children: [_jsxs("span", { children: ["\uD655\uC778\uC744 \uC704\uD574 \"", CONFIRM_TEXT, "\"\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694"] }), _jsx("input", { value: confirmText, maxLength: 10, autoComplete: "off", placeholder: CONFIRM_TEXT, onChange: (e) => { setConfirmText(e.target.value); setError(null); }, "aria-invalid": error?.field === 'confirmText' }), error?.field === 'confirmText' && _jsx("small", { className: "error", children: error.text })] }))] }), error?.field === 'form' && _jsx("div", { className: "banner banner-warn", role: "alert", children: error.text }), _jsxs("div", { className: "withdraw-actions", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: () => navigate('/settings'), children: "\uCDE8\uC18C" }), _jsx("button", { type: "submit", className: "btn btn-danger", disabled: !ready || busy || s.admin, children: busy ? '탈퇴하는 중…' : '탈퇴하기' })] })] })] }));
}
