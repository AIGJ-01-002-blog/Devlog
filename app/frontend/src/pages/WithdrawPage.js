import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useState } from 'react';
import { clearLocalData, useAuth } from '../lib/auth';
import { Link, navigate } from '../lib/router';
import { CONFIRM_TEXT, deadline, withdrawApi, withdrawErrorText, withdrawReady } from '../lib/withdraw';
import { t, tNodes } from '../lib/i18n';
/**
 * 회원 탈퇴 (020 US1): 한 화면에 ① 잃게 되는 것과 확인 체크 → ② 본인 확인 → [탈퇴하기].
 * 탈퇴 사유는 묻지 않는다(FR-004). [탈퇴하기]는 빨간색이지만 처음 초점을 받지 않는다(FR-005).
 */
export function WithdrawPage() {
    const { me, refresh } = useAuth();
    const [s, setS] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [checked, setChecked] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const checkId = useId();
    useEffect(() => {
        document.title = t('회원 탈퇴 - devlog');
        withdrawApi.summary().then(setS).catch(() => setLoadError(true));
    }, []);
    if (loadError)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "error center", role: "alert", children: t('불러오지 못했어요. 새로고침해 주세요.') }) });
    if (!s)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: t('불러오는 중…') }) });
    const ready = withdrawReady(s.method, checked, password, confirmText);
    const submit = async (e) => {
        e.preventDefault();
        if (!ready || busy)
            return;
        setBusy(true);
        setError(null);
        try {
            const r = await withdrawApi.withdraw(s.method === 'PASSWORD' ? password : null, s.method === 'CONFIRM_TEXT' ? confirmText : null);
            // 서버가 모든 기기의 세션을 지웠다. 로그인 필요 화면이 로그인으로 보내기 전에 완료 화면으로 먼저 옮기고,
            // 이 브라우저의 임시 글 데이터도 로그아웃처럼 지운다 (FR-014)
            const id = me?.member?.id;
            navigate(`/withdrawn?until=${encodeURIComponent(r.restoreBy)}`, { replace: true });
            await clearLocalData(id);
            await refresh();
        }
        catch (err) {
            setError(withdrawErrorText(err));
            setBusy(false);
        }
    };
    return (_jsxs("main", { className: "container narrow withdraw-page", children: [_jsx("h1", { className: "page-title", children: t('회원 탈퇴') }), s.admin && _jsx("div", { className: "banner banner-warn", role: "alert", children: t('관리자 권한을 해제한 뒤 탈퇴할 수 있어요.') }), _jsxs("form", { onSubmit: submit, noValidate: true, children: [_jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: t('① 탈퇴하면 이렇게 돼요') }), _jsxs("ul", { className: "withdraw-facts", children: [_jsx("li", { children: tNodes('블로그 {0}와 글 {1}가 바로 다른 사람에게 보이지 않아요.', { 0: _jsxs("b", { children: ["@", s.handle] }), 1: _jsx("b", { children: t('{0}개', { 0: s.posts }) }) }) }), _jsx("li", { children: tNodes('남의 글에 쓴 댓글 {0}는 "탈퇴한 사용자의 댓글이에요"로 가려져요.', { 0: _jsx("b", { children: t('{0}개', { 0: s.comments }) }) }) }), _jsx("li", { children: tNodes('{0}까지 다시 로그인하면 모두 복구할 수 있어요.', { 0: _jsx("b", { children: deadline(s.restoreBy) }) }) }), _jsx("li", { children: tNodes('30일이 지나면 글·사진·받은 좋아요 {0}가 완전히 삭제되어 되돌릴 수 없어요. 답글이 달린 댓글은 내용 없이 자리만 남아요.', { 0: _jsx("b", { children: t('{0}개', { 0: s.likesReceived }) }) }) }), _jsx("li", { children: tNodes('블로그 주소 {0}는 다른 사람도, 나도 다시 쓸 수 없어요.', { 0: _jsxs("b", { children: ["@", s.handle] }) }) })] }), s.posts > 0 && (_jsx("p", { className: "small", children: tNodes('글을 간직하고 싶다면 먼저 {0}에서 Markdown으로 받아 두세요.', { 0: _jsx(Link, { to: "/settings#export", children: t('설정 › 내 글 내보내기') }) }) })), _jsxs("label", { className: "check", htmlFor: checkId, children: [_jsx("input", { id: checkId, type: "checkbox", checked: checked, onChange: (e) => setChecked(e.target.checked) }), "  ", t('위 내용을 확인했어요')] })] }), _jsxs("section", { className: "settings-section", children: [_jsx("h2", { children: t('② 본인 확인') }), s.method === 'PASSWORD' ? (_jsxs("label", { className: "field", children: [_jsx("span", { children: t('현재 비밀번호') }), _jsx("input", { type: "password", value: password, maxLength: 64, autoComplete: "current-password", onChange: (e) => { setPassword(e.target.value); setError(null); }, "aria-invalid": error?.field === 'password', "aria-describedby": error?.field === 'password' ? 'withdraw-error' : undefined }), error?.field === 'password' && _jsx("small", { id: "withdraw-error", className: "error", role: "alert", children: error.text })] })) : (_jsxs("label", { className: "field", children: [_jsx("span", { children: tNodes('확인을 위해 "{0}"를 입력해 주세요', { 0: CONFIRM_TEXT }) }), _jsx("input", { value: confirmText, maxLength: 10, autoComplete: "off", placeholder: CONFIRM_TEXT, onChange: (e) => { setConfirmText(e.target.value); setError(null); }, "aria-invalid": error?.field === 'confirmText', "aria-describedby": error?.field === 'confirmText' ? 'withdraw-error' : undefined }), error?.field === 'confirmText' && _jsx("small", { id: "withdraw-error", className: "error", role: "alert", children: error.text })] }))] }), error?.field === 'form' && _jsx("div", { className: "banner banner-warn", role: "alert", children: error.text }), _jsxs("div", { className: "withdraw-actions", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: () => navigate('/settings'), children: t('취소') }), _jsx("button", { type: "submit", className: "btn btn-danger", disabled: !ready || busy || s.admin, children: busy ? t('탈퇴하는 중…') : t('탈퇴하기') })] })] })] }));
}
