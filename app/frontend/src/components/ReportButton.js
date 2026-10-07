import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useState } from 'react';
import { loginPath, useAuth } from '../lib/auth';
import { DETAIL_MAX, REASONS, reportApi, reportErrorText } from '../lib/moderation';
import { navigate } from '../lib/router';
import { Modal } from './Modal';
/**
 * [신고] (spec 019 US1). 비회원·인증 전 회원에게도 보이고 누르면 로그인·인증 안내로 보낸다(H6). 작성자 본인에게는 그리지 않는다.
 * 같은 대상을 다시 신고해도 같은 안내다(서버가 한 건으로 남긴다).
 */
export function ReportButton({ targetType, targetId, label = '신고' }) {
    const { me, loading } = useAuth();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(null);
    const [detail, setDetail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);
    const [notice, setNotice] = useState(null);
    const titleId = useId();
    const start = () => {
        if (loading)
            return; // 로그인 상태를 읽는 중에 누르면 로그인 화면으로 잘못 보내지 않는다
        if (!me?.authenticated)
            return navigate(loginPath());
        if (!me.emailVerified)
            return setNotice('이메일 인증 후 신고할 수 있어요.');
        setReason(null);
        setDetail('');
        setError(null);
        setDone(false);
        setOpen(true);
    };
    const submit = async () => {
        if (!reason)
            return setError('신고 사유를 골라 주세요.');
        if (reason === 'OTHER' && !detail.trim())
            return setError('기타 사유를 적어 주세요.');
        setBusy(true);
        setError(null);
        try {
            await reportApi.report(targetType, targetId, reason, reason === 'OTHER' ? detail.trim() : null);
            setDone(true);
        }
        catch (e) {
            setError(reportErrorText(e));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "btn btn-text report-button", onClick: start, children: label }), notice && _jsx("span", { className: "like-notice", role: "status", children: notice }), open && (_jsxs(Modal, { labelledBy: titleId, onClose: () => setOpen(false), closeOnBackdrop: true, children: [_jsx("h2", { id: titleId, children: targetType === 'POST' ? '글 신고' : '댓글 신고' }), done ? (_jsxs(_Fragment, { children: [_jsx("p", { role: "status", children: "\uC2E0\uACE0\uAC00 \uC811\uC218\uB410\uC5B4\uC694. \uAC80\uD1A0 \uD6C4 \uCC98\uB9AC\uD560\uAC8C\uC694." }), _jsx("footer", { className: "dialog-footer", children: _jsx("button", { type: "button", className: "btn btn-primary", onClick: () => setOpen(false), children: "\uB2EB\uAE30" }) })] })) : (_jsxs(_Fragment, { children: [_jsxs("fieldset", { className: "field report-reasons", children: [_jsx("legend", { children: "\uC2E0\uACE0 \uC0AC\uC720" }), REASONS.map((r) => (_jsxs("label", { children: [_jsx("input", { type: "radio", name: `reason-${titleId}`, value: r.code, checked: reason === r.code, onChange: () => { setReason(r.code); setError(null); } }), " ", r.label] }, r.code)))] }), reason === 'OTHER' && (_jsxs("label", { className: "field", children: [_jsxs("span", { children: ["\uC124\uBA85 (", [...detail].length, "/", DETAIL_MAX, ")"] }), _jsx("textarea", { value: detail, maxLength: DETAIL_MAX, rows: 3, onChange: (e) => setDetail(e.target.value), placeholder: "\uC5B4\uB5A4 \uBB38\uC81C\uC778\uC9C0 \uC801\uC5B4 \uC8FC\uC138\uC694" })] })), _jsx("p", { className: "muted small", children: "\uC2E0\uACE0\uD55C \uC0AC\uB78C\uC740 \uC791\uC131\uC790\uC5D0\uAC8C \uC54C\uB824\uC9C0\uC9C0 \uC54A\uC544\uC694." }), error && _jsx("p", { className: "error small", role: "alert", children: error }), _jsxs("footer", { className: "dialog-footer", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: () => setOpen(false), disabled: busy, children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: submit, disabled: busy, children: busy ? '보내는 중…' : '신고하기' })] })] }))] }))] }));
}
