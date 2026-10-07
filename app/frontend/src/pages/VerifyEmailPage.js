import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Link, useLocation } from '../lib/router';
/** 인증 메일의 링크 (004 US1). 링크를 여는 것만으로 바뀌지 않게, 화면이 한 번 확인 요청을 보낸다. */
export function VerifyEmailPage() {
    const { search } = useLocation();
    const { me, refresh } = useAuth();
    const token = search.get('token') ?? '';
    const [state, setState] = useState('pending');
    const [message, setMessage] = useState(null);
    const started = useRef(false);
    useEffect(() => {
        if (started.current)
            return;
        started.current = true;
        if (!token)
            return setState('expired');
        api('/api/auth/email/verify', { method: 'POST', body: { token } })
            .then(async () => { setState('done'); await refresh(); })
            .catch((e) => {
            if (e instanceof ApiError && e.code === 'LINK_EXPIRED')
                setState('expired');
            else {
                setState('error');
                setMessage(e instanceof ApiError ? e.message : null);
            }
        });
    }, [token, refresh]);
    const resend = async () => {
        try {
            await api('/api/auth/email/resend', { method: 'POST' });
            setMessage('인증 메일을 다시 보냈어요.');
        }
        catch (e) {
            setMessage(e instanceof ApiError ? e.message : '보내지 못했어요.');
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page", children: [state === 'pending' && _jsx("p", { className: "muted center", children: "\uD655\uC778\uD558\uB294 \uC911\u2026" }), state === 'done' && (_jsxs(_Fragment, { children: [_jsx("h1", { children: "\uC778\uC99D\uC774 \uC644\uB8CC\uB410\uC5B4\uC694" }), _jsx("p", { className: "muted", children: "\uC774\uC81C \uAE00\uC744 \uC4F8 \uC218 \uC788\uC5B4\uC694." }), _jsx(Link, { to: me?.authenticated ? '/write' : '/login', className: "btn btn-primary btn-block", children: me?.authenticated ? '첫 글 쓰기' : '로그인' })] })), state === 'expired' && (_jsxs(_Fragment, { children: [_jsx("h1", { children: "\uB9C1\uD06C\uAC00 \uB9CC\uB8CC\uB410\uC5B4\uC694" }), _jsx("p", { className: "muted", children: "\uC774\uBBF8 \uC4F4 \uB9C1\uD06C\uC774\uAC70\uB098 24\uC2DC\uAC04\uC774 \uC9C0\uB0AC\uC5B4\uC694." }), me?.authenticated && !me.emailVerified
                        ? _jsx("button", { type: "button", className: "btn btn-primary btn-block", onClick: resend, children: "\uC778\uC99D \uBA54\uC77C \uB2E4\uC2DC \uBCF4\uB0B4\uAE30" })
                        : _jsx(Link, { to: "/login", className: "btn btn-primary btn-block", children: "\uB85C\uADF8\uC778\uD558\uACE0 \uB2E4\uC2DC \uBC1B\uAE30" })] })), state === 'error' && _jsxs(_Fragment, { children: [_jsx("h1", { children: "\uC9C0\uAE08\uC740 \uD655\uC778\uD560 \uC218 \uC5C6\uC5B4\uC694" }), _jsx("p", { className: "muted", children: "\uC7A0\uC2DC \uD6C4 \uB9C1\uD06C\uB97C \uB2E4\uC2DC \uC5F4\uC5B4 \uC8FC\uC138\uC694." })] }), message && _jsx("p", { className: "muted small", role: "status", children: message })] }));
}
