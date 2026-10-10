import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { changeLocale, LOCALES, t, useLocale } from '../lib/i18n';
/**
 * 머리말의 🌐 언어 메뉴 (081). 테마 버튼 옆에 두어 어느 화면에서나 한 번에 바꾼다.
 * 고르면 changeLocale이 저장하고 페이지를 다시 불러온다.
 */
export function LanguageMenu() {
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);
    const buttonRef = useRef(null);
    const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
    useEffect(() => {
        if (!open)
            return;
        // 열리면 지금 언어에 초점을 둔다 (WAI-ARIA menu button)
        boxRef.current?.querySelector('[aria-checked="true"]')?.focus();
        const close = (e) => {
            if (!boxRef.current?.contains(e.target))
                setOpen(false);
        };
        const esc = (e) => {
            if (e.key !== 'Escape')
                return;
            setOpen(false);
            buttonRef.current?.focus();
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', esc);
        };
    }, [open]);
    const onKey = (e) => {
        const items = [...(boxRef.current?.querySelectorAll('[role="menuitemradio"]') ?? [])];
        const i = items.indexOf(document.activeElement);
        let next;
        if (e.key === 'ArrowDown')
            next = (i + 1) % items.length;
        else if (e.key === 'ArrowUp')
            next = i <= 0 ? items.length - 1 : i - 1;
        else if (e.key === 'Home')
            next = 0;
        else if (e.key === 'End')
            next = items.length - 1;
        else
            return;
        e.preventDefault();
        items[next]?.focus();
    };
    return (_jsxs("div", { className: "menu lang-menu", ref: boxRef, children: [_jsx("button", { type: "button", ref: buttonRef, className: "btn btn-text lang-toggle", "aria-haspopup": "menu", "aria-expanded": open, "aria-label": t('언어: {0}', { 0: current.label }), "data-tip": t('화면 언어 바꾸기'), onClick: () => setOpen((o) => !o), children: _jsx("span", { "aria-hidden": "true", children: "\uD83C\uDF10" }) }), open && (_jsx("div", { className: "menu-list lang-list", role: "menu", "aria-label": t('언어'), onKeyDown: onKey, children: LOCALES.map((l) => (_jsxs("button", { type: "button", role: "menuitemradio", "aria-checked": l.code === locale, lang: l.code, onClick: () => { setOpen(false); if (l.code !== locale)
                        changeLocale(l.code); }, children: [_jsx("span", { className: "lang-check", "aria-hidden": "true", children: l.code === locale ? '✓' : '' }), l.label] }, l.code))) }))] }));
}
