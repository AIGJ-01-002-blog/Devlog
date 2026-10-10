import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n';
/** 복사 버튼이 붙은 코드 상자. 클립보드를 못 쓰면 글자를 골라 둬서 직접 복사하게 한다. */
export function CopyCode({ code, label }) {
    const [state, setState] = useState('idle');
    const codeRef = useRef(null);
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
            // 클립보드를 못 쓰면 글자를 골라 둔다. 사용자는 바로 Ctrl+C만 누르면 된다
            const el = codeRef.current;
            const sel = window.getSelection();
            if (el && sel) {
                const range = document.createRange();
                range.selectNodeContents(el);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            setState('failed');
        }
    };
    return (_jsxs("div", { className: "copy-code", children: [_jsx("pre", { "aria-label": label, children: _jsx("code", { ref: codeRef, children: code }) }), _jsx("button", { type: "button", className: "btn btn-small copy-code-button", "data-tip": t('코드를 클립보드에 복사해요'), onClick: copy, children: state === 'copied' ? t('복사됨') : t('복사') }), _jsx("span", { className: "sr-only", role: "status", children: state === 'copied' ? t('{0} 복사됨', { 0: label }) : state === 'failed' ? t('복사하지 못했어요. 글자를 골라 두었으니 Ctrl+C로 복사해 주세요') : '' })] }));
}
