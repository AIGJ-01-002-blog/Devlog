import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Link, useLocation } from '../lib/router';
import { deadline } from '../lib/withdraw';
/** 탈퇴 완료 (020 FR-014). 이미 로그아웃된 상태라 기한은 주소로 받는다. */
export function WithdrawnPage() {
    const { search } = useLocation();
    const until = search.get('until');
    const valid = until != null && !Number.isNaN(new Date(until).getTime());
    useEffect(() => { document.title = '탈퇴 신청 완료 - devlog'; }, []);
    return (_jsxs("main", { className: "container narrow auth-page center", children: [_jsx("h1", { children: "\uD0C8\uD1F4 \uC2E0\uCCAD\uC774 \uC644\uB8CC\uB410\uC5B4\uC694" }), _jsxs("p", { children: [valid ? _jsxs(_Fragment, { children: [_jsx("b", { children: deadline(until) }), "\uAE4C\uC9C0"] }) : '30일 안에', " \uB85C\uADF8\uC778\uD558\uBA74 \uBCF5\uAD6C\uD560 \uC218 \uC788\uC5B4\uC694."] }), _jsx("p", { className: "muted", children: "\uADF8\uB3D9\uC548 \uBE14\uB85C\uADF8\uC640 \uAE00\uC740 \uB2E4\uB978 \uC0AC\uB78C\uC5D0\uAC8C \uBCF4\uC774\uC9C0 \uC54A\uC544\uC694." }), _jsx(Link, { to: "/", className: "btn btn-primary", children: "\uD648\uC73C\uB85C" })] }));
}
