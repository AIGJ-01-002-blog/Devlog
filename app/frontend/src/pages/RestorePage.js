import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { setFlash } from '../lib/flash';
import { navigate } from '../lib/router';
import { daysLeft, deadline, withdrawApi } from '../lib/withdraw';
/**
 * 탈퇴 유예 회원의 유일한 화면 (020 US2). 로그인만으로는 복구하지 않고 [복구하기]를 눌러야 한다(FR-017).
 * [로그아웃]은 로그아웃만 하고 유예는 그대로다(FR-018).
 */
export function RestorePage() {
    const { refresh, logout } = useAuth();
    const [s, setS] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        document.title = '계정 복구 - devlog';
        withdrawApi.summary().then(setS).catch(() => setError('불러오지 못했어요. 새로고침해 주세요.'));
    }, []);
    const restore = async () => {
        setBusy(true);
        setError(null);
        try {
            await withdrawApi.restore();
            setFlash('다시 오신 걸 환영해요');
            await refresh();
            navigate('/', { replace: true });
        }
        catch (e) {
            // 다른 기기에서 이미 복구했으면 그대로 홈으로
            if (e instanceof ApiError && e.code === 'NOT_WITHDRAWN') {
                await refresh();
                navigate('/', { replace: true });
                return;
            }
            setError(e instanceof ApiError ? e.message : '잠시 후 다시 시도해 주세요.');
            setBusy(false);
        }
    };
    const leave = async () => {
        setBusy(true);
        setError(null);
        try {
            await logout();
            navigate('/', { replace: true });
        }
        catch {
            setError('로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.');
            setBusy(false);
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page restore-page center", children: [_jsx("h1", { children: "\uD0C8\uD1F4 \uC2E0\uCCAD\uD55C \uACC4\uC815\uC774\uC5D0\uC694" }), s && (_jsxs(_Fragment, { children: [_jsxs("p", { children: [_jsx("b", { children: deadline(s.restoreBy) }), "\uAE4C\uC9C0 \uBCF5\uAD6C\uD560 \uC218 \uC788\uC5B4\uC694 ", _jsxs("span", { className: "nowrap", children: ["(", daysLeft(s.restoreBy), "\uC77C \uB0A8\uC74C)"] })] }), _jsx("p", { className: "muted", children: "\uBCF5\uAD6C\uD558\uBA74 \uBE14\uB85C\uADF8\u00B7\uAE00\u00B7\uB313\uAE00\uC774 \uBAA8\uB450 \uC6D0\uB798\uB300\uB85C \uB3CC\uC544\uC640\uC694." })] })), error && _jsx("p", { className: "error", role: "alert", children: error }), _jsxs("div", { className: "banner-actions restore-actions", children: [_jsx("button", { type: "button", className: "btn btn-outline", onClick: leave, disabled: busy, children: "\uB85C\uADF8\uC544\uC6C3" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: restore, disabled: busy || !s, children: busy ? '복구하는 중…' : '복구하기' })] })] }));
}
