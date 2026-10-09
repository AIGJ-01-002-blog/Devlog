import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { branchNeighbors, readPosts } from '../lib/branch';
import { Link } from '../lib/router';
import { BranchMark } from './BranchList';
/**
 * 글 화면 브랜치 상자 (072 2단계). 이 글이 이어지는 시리즈·주제 브랜치의 글을 그래프 모양으로 보인다:
 * 맨 아래가 main에서 갈라진 첫 글이고 위로 갈수록 최근 글이다. 지금 글은 강조하고, 이 기기에서 읽은 글에는 체크를 단다.
 */
export function BranchBox({ nav, postId }) {
    const read = useMemo(() => readPosts(), [postId]);
    const { prev, next } = branchNeighbors(nav);
    const kind = nav.kind.toLowerCase();
    const rows = [...nav.posts].reverse();
    return (_jsxs("nav", { className: `branch-box branch-box-${kind}`, "aria-label": nav.kind === 'SERIES' ? '시리즈' : '이어지는 주제', children: [_jsxs("header", { className: "branch-box-head", children: [_jsxs(Link, { to: nav.url, className: `bl-branch bl-branch-${kind}`, "data-tip": nav.kind === 'SERIES' ? '시리즈 글 모두 보기' : '홈에서 자동으로 묶인 비슷한 글만 보기', children: [_jsx(BranchMark, { kind: nav.kind }), nav.name, " ", nav.kind === 'SERIES' ? '시리즈' : '브랜치'] }), _jsx("span", { className: "muted small", children: nav.index != null ? `${nav.posts.length}편 중 ${nav.index}편` : `글 ${nav.posts.length}편` })] }), _jsxs("ol", { className: "branch-box-list", reversed: true, children: [rows.map((p) => {
                        const here = p.id === postId;
                        return (_jsxs("li", { className: here ? 'is-here' : undefined, "aria-current": here ? 'page' : undefined, children: [_jsx("span", { className: "branch-box-dot", "aria-hidden": "true" }), here ? _jsx("b", { children: p.title }) : _jsx(Link, { to: p.url, children: p.title }), !here && read.has(p.id) && _jsxs("span", { className: "branch-box-read", "data-tip": "\uC774 \uAE30\uAE30\uC5D0\uC11C \uC77D\uC740 \uAE00", tabIndex: 0, children: [_jsx("span", { "aria-hidden": "true", children: "\u2713" }), _jsx("span", { className: "sr-only", children: "\uC77D\uC74C" })] })] }, p.id));
                    }), _jsxs("li", { className: "branch-box-fork", "aria-hidden": "true", children: [_jsx("span", { className: "branch-box-dot" }), "main\uC5D0\uC11C \uAC08\uB77C\uC9D0"] })] }), _jsxs("footer", { className: "branch-box-foot", children: [prev ? _jsx(Link, { to: prev.url, className: "btn btn-outline btn-small", "data-tip": prev.title, children: "\u2039 \uC774\uC804 \uAE00" }) : _jsx("span", {}), next ? _jsx(Link, { to: next.url, className: "btn btn-primary btn-small", "data-tip": next.title, children: "\uB2E4\uC74C \uAE00 \u203A" }) : null] })] }));
}
