import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { passwordRules } from '../lib/password';
/** 규칙별 충족 여부를 글자와 ✓로 보여 준다 (색만으로 표시하지 않는다, 004 FR-018). */
export function PasswordRules({ password, email, id }) {
    return (_jsx("ul", { className: "pw-rules", id: id, "aria-live": "polite", children: passwordRules(password, email).map((r) => {
            const ok = password !== '' && r.ok; // 비어 있을 때는 아무 규칙도 충족한 것으로 보이지 않게
            return (_jsxs("li", { className: ok ? 'ok' : password ? 'bad' : '', children: [_jsx("span", { "aria-hidden": "true", children: ok ? '✓' : '·' }), " ", r.label, _jsx("span", { className: "sr-only", children: ok ? ' 충족' : ' 미충족' })] }, r.id));
        }) }));
}
