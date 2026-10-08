import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
/** 복사 버튼이 붙은 코드 상자. 클립보드를 못 쓰면 글자를 골라 둬서 직접 복사하게 한다. */
export function CopyCode({ code, label }) {
    const [state, setState] = useState('idle');
    useEffect(() => {
        if (state === 'idle')
            return;
        const t = setTimeout(() => setState('idle'), 2000);
        return () => clearTimeout(t);
    }, [state]);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setState('copied');
        }
        catch {
            setState('failed');
        }
    };
    return (_jsxs("div", { className: "copy-code", children: [_jsx("pre", { "aria-label": label, children: _jsx("code", { children: code }) }), _jsx("button", { type: "button", className: "btn btn-small copy-code-button", onClick: copy, children: state === 'copied' ? '복사됨' : '복사' }), _jsx("span", { className: "sr-only", role: "status", children: state === 'copied' ? `${label} 복사됨` : state === 'failed' ? '복사하지 못했어요. 직접 골라 복사해 주세요' : '' })] }));
}
