import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { prepublishChecks } from '../lib/prepublish';
import { t, tNodes } from '../lib/i18n';
const ICON = { ok: '✓', warn: '⚠', info: 'ℹ' };
const LABEL = { ok: t('통과'), warn: t('확인 필요'), info: t('참고') };
/** 발행 전 점검 (057). 발행을 막지 않는 안내라 색과 함께 기호·숨은 글자로 상태를 알린다. */
export function PrepublishCheck(props) {
    const items = prepublishChecks(props);
    const warns = items.filter((i) => i.level === 'warn').length;
    return (_jsxs("details", { className: "prepublish", open: warns > 0, children: [_jsxs("summary", { "data-tip": t('발행하기 전에 놓치기 쉬운 것을 훑어봐요. 발행을 막지는 않아요.'), children: [t('발행 전 점검'), " ", warns > 0 ? _jsx("span", { className: "prepublish-count", children: tNodes('확인할 것 {0}개', { 0: warns }) }) : _jsx("span", { className: "muted small", children: t('확인할 것 없음') })] }), _jsx("ul", { children: items.map((i) => (_jsxs("li", { className: `prepublish-${i.level}`, children: [_jsx("span", { "aria-hidden": "true", className: "prepublish-icon", children: ICON[i.level] }), _jsxs("span", { className: "sr-only", children: [LABEL[i.level], ": "] }), i.text] }, i.id))) })] }));
}
