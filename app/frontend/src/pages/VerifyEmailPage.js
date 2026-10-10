import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Link, useLocation } from '../lib/router';
import { t } from '../lib/i18n';
/** 인증 메일의 링크 (004 US1). 링크를 여는 것만으로 바뀌지 않게, 화면이 한 번 확인 요청을 보낸다. */
export function VerifyEmailPage() {
    const { search } = useLocation();
    const { me, refresh } = useAuth();
    const token = search.get('token') ?? '';
    const [state, setState] = useState('pending');
    const [message, setMessage] = useState(null);
    const [sending, setSending] = useState(false);
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
        setSending(true);
        setMessage(null);
        try {
            await api('/api/auth/email/resend', { method: 'POST' });
            setMessage(t('인증 메일을 다시 보냈어요.'));
        }
        catch (e) {
            setMessage(e instanceof ApiError ? e.message : t('보내지 못했어요.'));
        }
        finally {
            setSending(false);
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page", children: [state === 'pending' && _jsx("p", { className: "muted center", children: t('확인하는 중…') }), state === 'done' && (_jsxs(_Fragment, { children: [_jsx("h1", { children: t('인증이 완료됐어요') }), _jsx("p", { className: "muted", children: t('이제 글을 쓸 수 있어요.') }), _jsx(Link, { to: me?.authenticated ? '/write' : '/login', className: "btn btn-primary btn-block", children: me?.authenticated ? t('첫 글 쓰기') : t('로그인') })] })), state === 'expired' && (_jsxs(_Fragment, { children: [_jsx("h1", { children: t('링크가 만료됐어요') }), _jsx("p", { className: "muted", children: t('이미 쓴 링크이거나 24시간이 지났어요.') }), me?.authenticated && !me.emailVerified
                        ? _jsx("button", { type: "button", className: "btn btn-primary btn-block", disabled: sending, onClick: resend, children: sending ? t('보내는 중…') : t('인증 메일 다시 보내기') })
                        : _jsx(Link, { to: "/login", className: "btn btn-primary btn-block", children: t('로그인하고 다시 받기') })] })), state === 'error' && _jsxs(_Fragment, { children: [_jsx("h1", { children: t('지금은 확인할 수 없어요') }), _jsx("p", { className: "muted", children: t('잠시 후 링크를 다시 열어 주세요.') })] }), message && _jsx("p", { className: "muted small", role: "status", children: message })] }));
}
