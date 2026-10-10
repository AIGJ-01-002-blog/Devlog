import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { takeFlash } from '../lib/flash';
import { t } from '../lib/i18n';
export function Flash({ path }) {
    const [message, setMessage] = useState(null);
    useEffect(() => {
        const m = takeFlash();
        if (m)
            setMessage(m);
    }, [path]);
    // 알림 영역은 늘 두고 안의 글만 바꿔야 화면 읽기 프로그램이 놓치지 않는다
    return (_jsx("div", { className: "container", role: "status", children: message && (_jsxs("div", { className: "banner banner-warn flash", children: [_jsx("span", { children: message }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setMessage(null), "aria-label": t('닫기'), children: "\u2715" })] })) }));
}
