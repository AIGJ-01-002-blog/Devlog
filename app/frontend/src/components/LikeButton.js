import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { loginPath, useAuth } from '../lib/auth';
import { compactNumber } from '../lib/format';
import { createLikeSync, likesApi } from '../lib/likes';
import { Link } from '../lib/router';
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
        return _jsxs("span", { className: "like-count", children: [_jsxs("span", { "aria-hidden": "true", children: ["\u2665 ", count] }), _jsxs("span", { className: "sr-only", children: ["\uC88B\uC544\uC694 ", state.likeCount, "\uAC1C"] })] });
    const press = () => {
        if (!me?.authenticated)
            return setNotice('login');
        if (!me.emailVerified)
            return setNotice('verify');
        setNotice(null);
        sync.current?.toggle();
    };
    return (_jsxs("span", { className: "like", children: [_jsx("button", { type: "button", className: `like-button${state.liked ? ' liked' : ''}`, "aria-pressed": state.liked, "aria-label": `좋아요 ${state.likeCount}개`, onClick: press, children: _jsxs("span", { "aria-hidden": "true", children: [state.liked ? '♥' : '♡', " ", count] }) }), notice === 'login' && (_jsxs("span", { className: "like-notice", role: "status", children: ["\uB85C\uADF8\uC778\uD558\uACE0 \uC88B\uC544\uC694\uB97C \uB20C\uB7EC \uBCF4\uC138\uC694 ", _jsx(Link, { to: loginPath(), className: "btn btn-text", children: "\uB85C\uADF8\uC778" })] })), notice === 'verify' && _jsx("span", { className: "like-notice", role: "status", children: "\uC774\uBA54\uC77C \uC778\uC99D \uD6C4 \uB204\uB97C \uC218 \uC788\uC5B4\uC694" }), notice === 'failed' && _jsx("span", { className: "like-notice error", role: "alert", children: "\uC88B\uC544\uC694\uB97C \uBC18\uC601\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694" })] }));
}
