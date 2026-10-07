import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
/** 글 상세 아래 이전·다음 글 (velog의 이전/다음 포스트). 본문 아래라 늦게 읽고, 실패하면 아무것도 그리지 않는다. */
export function AdjacentPosts({ postId }) {
    const [adj, setAdj] = useState(null);
    useEffect(() => {
        let alive = true;
        api(`/api/posts/${postId}/adjacent`).then((a) => { if (alive)
            setAdj(a); }).catch(() => { });
        return () => { alive = false; };
    }, [postId]);
    if (!adj || (!adj.prev && !adj.next))
        return null;
    return (_jsxs("nav", { className: "adjacent-posts", "aria-label": "\uC774\uC804 \uAE00\uACFC \uB2E4\uC74C \uAE00", children: [adj.prev && (_jsxs(Link, { to: adj.prev.url, className: "adjacent prev", rel: "prev", children: [_jsx("span", { className: "muted small", children: "\u2190 \uC774\uC804 \uAE00" }), _jsx("b", { children: adj.prev.title })] })), adj.next && (_jsxs(Link, { to: adj.next.url, className: "adjacent next", rel: "next", children: [_jsx("span", { className: "muted small", children: "\uB2E4\uC74C \uAE00 \u2192" }), _jsx("b", { children: adj.next.title })] }))] }));
}
