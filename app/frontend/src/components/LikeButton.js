import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { loginPath, useAuth } from '../lib/auth';
import { compactNumber } from '../lib/format';
import { createLikeSync, likesApi } from '../lib/likes';
import { Link } from '../lib/router';
import { t } from '../lib/i18n';
/**
 * 글 상세 좋아요 (spec 012, docs/30 §5). 작성자에게는 개수만, 비회원·인증 전 회원에게는 버튼을 보이고 누르면 안내한다.
 * 누르는 즉시 ♡/♥와 숫자가 바뀌고, 마지막 상태만 0.3초 뒤에 보낸다.
 * 버튼 이름은 그대로 두고 눌림 여부는 aria-pressed로만 알린다(토글 버튼 규칙).
 */
export function LikeButton({ postId, mine, initial, onChange }) {
    const { me } = useAuth();
    const [state, setState] = useState(initial);
    const [notice, setNotice] = useState(null);
    const sync = useRef(null);
    const changed = useRef(onChange);
    changed.current = onChange;
    useEffect(() => {
        const s = createLikeSync({
            initial,
            send: (liked) => likesApi.set(postId, liked),
            onChange: (next) => { setState(next); changed.current?.(next); },
            onError: () => setNotice('failed'),
        });
        sync.current = s;
        return () => s.dispose();
        // 글이 바뀔 때만 새로 만든다
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postId]);
    const count = compactNumber(state.likeCount);
    if (mine)
        return _jsxs("span", { className: "like-count", children: [_jsxs("span", { "aria-hidden": "true", children: ["\u2665 ", count] }), _jsx("span", { className: "sr-only", children: t('좋아요 {0}개', { 0: state.likeCount }) })] });
    const press = () => {
        if (!me?.authenticated)
            return setNotice('login');
        if (!me.emailVerified)
            return setNotice('verify');
        setNotice(null);
        sync.current?.toggle();
    };
    return (_jsxs("span", { className: "like", children: [_jsx("button", { type: "button", className: `like-button${state.liked ? ' liked' : ''}`, "aria-pressed": state.liked, "aria-label": t('좋아요 {0}개', { 0: state.likeCount }), onClick: press, children: _jsxs("span", { "aria-hidden": "true", children: [state.liked ? '♥' : '♡', " ", count] }) }), notice === 'login' && (_jsxs("span", { className: "like-notice", role: "status", children: [t('로그인하고 좋아요를 눌러 보세요'), " ", _jsx(Link, { to: loginPath(), className: "btn btn-text", children: t('로그인') })] })), notice === 'verify' && _jsx("span", { className: "like-notice", role: "status", children: t('이메일 인증 후 누를 수 있어요') }), notice === 'failed' && _jsx("span", { className: "like-notice error", role: "alert", children: t('좋아요를 반영하지 못했어요') })] }));
}
