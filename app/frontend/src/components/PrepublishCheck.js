import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { prepublishChecks } from '../lib/prepublish';
const ICON = { ok: '✓', warn: '⚠', info: 'ℹ' };
const LABEL = { ok: '통과', warn: '확인 필요', info: '참고' };
/** 발행 전 점검 (056). 발행을 막지 않는 안내라 색과 함께 기호·숨은 글자로 상태를 알린다. */
export function PrepublishCheck(props) {
    const items = prepublishChecks(props);
    const warns = items.filter((i) => i.level === 'warn').length;
    return (_jsxs("details", { className: "prepublish", open: warns > 0, children: [_jsxs("summary", { title: "\uBC1C\uD589\uD558\uAE30 \uC804\uC5D0 \uB193\uCE58\uAE30 \uC26C\uC6B4 \uAC83\uC744 \uD6D1\uC5B4\uBD10\uC694. \uBC1C\uD589\uC744 \uB9C9\uC9C0\uB294 \uC54A\uC544\uC694.", children: ["\uBC1C\uD589 \uC804 \uC810\uAC80 ", warns > 0 ? _jsxs("span", { className: "prepublish-count", children: ["\uD655\uC778\uD560 \uAC83 ", warns, "\uAC1C"] }) : _jsx("span", { className: "muted small", children: "\uD655\uC778\uD560 \uAC83 \uC5C6\uC74C" })] }), _jsx("ul", { children: items.map((i) => (_jsxs("li", { className: `prepublish-${i.level}`, children: [_jsx("span", { "aria-hidden": "true", className: "prepublish-icon", children: ICON[i.level] }), _jsxs("span", { className: "sr-only", children: [LABEL[i.level], ": "] }), i.text] }, i.id))) })] }));
}
