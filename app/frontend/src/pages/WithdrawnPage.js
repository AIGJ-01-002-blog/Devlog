import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Link, useLocation } from '../lib/router';
import { deadline } from '../lib/withdraw';
import { t, tNodes } from '../lib/i18n';
/** 탈퇴 완료 (020 FR-014). 이미 로그아웃된 상태라 기한은 주소로 받는다. */
export function WithdrawnPage() {
    const { search } = useLocation();
    const until = search.get('until');
    const valid = until != null && !Number.isNaN(new Date(until).getTime());
    useEffect(() => { document.title = t('탈퇴 신청 완료 - devlog'); }, []);
    return (_jsxs("main", { className: "container narrow auth-page center", children: [_jsx("h1", { children: t('탈퇴 신청이 완료됐어요') }), _jsx("p", { children: valid ? tNodes('{0}까지 로그인하면 복구할 수 있어요.', { 0: _jsx("b", { children: deadline(until) }) }) : t('30일 안에 로그인하면 복구할 수 있어요.') }), _jsx("p", { className: "muted", children: t('그동안 블로그와 글은 다른 사람에게 보이지 않아요.') }), _jsx(Link, { to: "/", className: "btn btn-primary", children: t('홈으로') })] }));
}
