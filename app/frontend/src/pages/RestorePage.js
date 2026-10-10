import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { setFlash } from '../lib/flash';
import { navigate } from '../lib/router';
import { daysLeft, deadline, withdrawApi } from '../lib/withdraw';
import { t, tNodes } from '../lib/i18n';
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
        document.title = t('계정 복구 - devlog');
        withdrawApi.summary().then(setS).catch(() => setError(t('불러오지 못했어요. 새로고침해 주세요.')));
    }, []);
    const restore = async () => {
        setBusy(true);
        setError(null);
        try {
            await withdrawApi.restore();
            setFlash(t('다시 오신 걸 환영해요'));
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
            setError(e instanceof ApiError ? e.message : t('잠시 후 다시 시도해 주세요.'));
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
            setError(t('로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.'));
            setBusy(false);
        }
    };
    return (_jsxs("main", { className: "container narrow auth-page restore-page center", children: [_jsx("h1", { children: t('탈퇴 신청한 계정이에요') }), s && (_jsxs(_Fragment, { children: [_jsx("p", { children: tNodes('{0}까지 복구할 수 있어요 {1}', { 0: _jsx("b", { children: deadline(s.restoreBy) }), 1: _jsx("span", { className: "nowrap", children: t('({0}일 남음)', { 0: daysLeft(s.restoreBy) }) }) }) }), _jsx("p", { className: "muted", children: t('복구하면 블로그·글·댓글이 모두 원래대로 돌아와요.') })] })), error && _jsx("p", { className: "error", role: "alert", children: error }), _jsxs("div", { className: "banner-actions restore-actions", children: [_jsx("button", { type: "button", className: "btn btn-outline", onClick: leave, disabled: busy, children: t('로그아웃') }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: restore, disabled: busy || !s, children: busy ? t('복구하는 중…') : t('복구하기') })] })] }));
}
