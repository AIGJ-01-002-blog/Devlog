import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { SEARCH_MAX_LENGTH } from '../lib/search';
/** 검색창. 50자까지 받고(서버도 자른다) 빈 검색어는 보내지 않는다. */
export function SearchBox({ initial, placeholder, onSearch, autoFocus = false }) {
    const [value, setValue] = useState(initial);
    useEffect(() => setValue(initial), [initial]);
    const submit = (e) => {
        e.preventDefault();
        const q = value.trim();
        if (q)
            onSearch(q);
    };
    return (_jsxs("form", { className: "search-box", role: "search", onSubmit: submit, children: [_jsx("input", { type: "search", value: value, maxLength: SEARCH_MAX_LENGTH, placeholder: placeholder, "aria-label": placeholder, autoFocus: autoFocus, enterKeyHint: "search", onChange: (e) => setValue(e.target.value) }), _jsx("button", { type: "submit", className: "btn btn-dark", children: "\uAC80\uC0C9" })] }));
}
