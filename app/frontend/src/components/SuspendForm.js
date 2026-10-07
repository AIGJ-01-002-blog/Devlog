import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { SUSPEND_OPTIONS } from '../lib/moderation';
/** 정지 기간·사유 입력 (019 US4). 사유는 필수, 200자. */
export function SuspendFields({ days, reason, onChange }) {
    return (_jsxs("div", { className: "suspend-fields", children: [_jsxs("fieldset", { className: "field", children: [_jsx("legend", { children: "\uC815\uC9C0 \uAE30\uAC04" }), SUSPEND_OPTIONS.map((o) => (_jsxs("label", { children: [_jsx("input", { type: "radio", name: "suspend-days", checked: days === o.days, onChange: () => onChange(o.days, reason) }), " ", o.label] }, o.label)))] }), _jsxs("label", { className: "field", children: [_jsxs("span", { children: ["\uC815\uC9C0 \uC0AC\uC720 (", [...reason].length, "/200)"] }), _jsx("textarea", { rows: 2, maxLength: 200, value: reason, onChange: (e) => onChange(days, e.target.value), placeholder: "\uD68C\uC6D0\uC5D0\uAC8C \uBCF4\uC774\uB294 \uC0AC\uC720" })] })] }));
}
/** 회원 화면의 정지 양식 */
export function SuspendForm({ onSubmit }) {
    const [days, setDays] = useState(7);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    return (_jsxs("form", { className: "suspend-form", onSubmit: async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
                await onSubmit(days, reason.trim());
            }
            finally {
                setBusy(false);
            }
        }, children: [_jsx(SuspendFields, { days: days, reason: reason, onChange: (d, r) => { setDays(d); setReason(r); } }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: busy || !reason.trim(), children: busy ? '정지하는 중…' : '정지하기' })] }));
}
