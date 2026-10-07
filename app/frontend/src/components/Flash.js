import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { takeFlash } from '../lib/flash';
export function Flash({ path }) {
    const [message, setMessage] = useState(null);
    useEffect(() => {
        const m = takeFlash();
        if (m)
            setMessage(m);
    }, [path]);
    if (!message)
        return null;
    return (_jsx("div", { className: "container", children: _jsxs("div", { className: "banner banner-warn flash", role: "status", children: [_jsx("span", { children: message }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setMessage(null), "aria-label": "\uB2EB\uAE30", children: "\u2715" })] }) }));
}
