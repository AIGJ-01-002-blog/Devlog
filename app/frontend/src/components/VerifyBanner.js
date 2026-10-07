import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
/** 메일 인증 전 회원에게 쓰기 행동이 막혀 있다고 알리고 인증 메일을 다시 보낼 수 있게 한다 (004 US1). */
export function VerifyBanner() {
    const { me, refresh } = useAuth();
    const [message, setMessage] = useState(null);
    const [sending, setSending] = useState(false);
    if (!me?.authenticated || me.emailVerified)
        return null;
    const resend = async () => {
        setSending(true);
        try {
            await api('/api/auth/email/resend', { method: 'POST' });
            setMessage('인증 메일을 다시 보냈어요. 이전 메일의 링크는 더 이상 쓸 수 없어요.');
        }
        catch (e) {
            if (e instanceof ApiError && e.code === 'ALREADY_VERIFIED') {
                await refresh();
            }
            else if (e instanceof ApiError && e.status === 429) {
                setMessage(e.retryAfter && e.retryAfter > 120 ? '오늘은 더 보낼 수 없어요. 내일 다시 시도해 주세요.'
                    : `잠시 후 다시 보낼 수 있어요${e.retryAfter ? ` (${e.retryAfter}초 뒤)` : ''}.`);
            }
            else {
                setMessage(e instanceof ApiError ? e.message : '보내지 못했어요. 잠시 후 다시 시도해 주세요.');
            }
        }
        finally {
            setSending(false);
        }
    };
    return (_jsx("div", { className: "verify-banner", role: "status", children: _jsxs("div", { className: "container verify-inner", children: [_jsx("span", { children: "\uC774\uBA54\uC77C \uC778\uC99D\uC744 \uB9C8\uCCD0\uC57C \uAE00\uC744 \uC4F8 \uC218 \uC788\uC5B4\uC694. \uBC1B\uC740 \uBA54\uC77C\uC758 \uB9C1\uD06C\uB97C \uB20C\uB7EC \uC8FC\uC138\uC694." }), _jsx("button", { type: "button", className: "btn btn-text", onClick: resend, disabled: sending, children: sending ? '보내는 중…' : '인증 메일 다시 보내기' }), message && _jsx("span", { className: "small", children: message })] }) }));
}
