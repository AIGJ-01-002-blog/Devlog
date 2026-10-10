import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { branchNeighbors, readPosts } from '../lib/branch';
import { Link } from '../lib/router';
import { BranchMark } from './BranchList';
import { t } from '../lib/i18n';
/**
 * 글 화면 브랜치 상자 (072 2단계). 이 글이 이어지는 시리즈·주제 브랜치의 글을 그래프 모양으로 보인다:
 * 맨 아래가 main에서 갈라진 첫 글이고 위로 갈수록 최근 글이다. 지금 글은 강조하고, 이 기기에서 읽은 글에는 체크를 단다.
 */
export function BranchBox({ nav, postId }) {
    const read = useMemo(() => readPosts(), [postId]);
    const { prev, next } = branchNeighbors(nav);
    const kind = nav.kind.toLowerCase();
    const rows = [...nav.posts].reverse();
    return (_jsxs("nav", { className: `branch-box branch-box-${kind}`, "aria-label": nav.kind === 'SERIES' ? t('시리즈') : t('이어지는 주제'), children: [_jsxs("header", { className: "branch-box-head", children: [_jsxs(Link, { to: nav.url, className: `bl-branch bl-branch-${kind}`, "data-tip": nav.kind === 'SERIES' ? t('시리즈 글 모두 보기') : t('홈에서 자동으로 묶인 비슷한 글만 보기'), children: [_jsx(BranchMark, { kind: nav.kind }), nav.name, " ", nav.kind === 'SERIES' ? t('시리즈') : t('브랜치')] }), _jsx("span", { className: "muted small", children: nav.index != null ? t('{0}편 중 {1}편', { 0: nav.posts.length, 1: nav.index }) : t('글 {0}편', { 0: nav.posts.length }) })] }), _jsxs("ol", { className: "branch-box-list", reversed: true, children: [rows.map((p) => {
                        const here = p.id === postId;
                        return (_jsxs("li", { className: here ? 'is-here' : undefined, "aria-current": here ? 'page' : undefined, children: [_jsx("span", { className: "branch-box-dot", "aria-hidden": "true" }), here ? _jsx("b", { children: p.title }) : _jsx(Link, { to: p.url, children: p.title }), !here && read.has(p.id) && _jsxs("span", { className: "branch-box-read", "data-tip": t('이 기기에서 읽은 글'), tabIndex: 0, children: [_jsx("span", { "aria-hidden": "true", children: "\u2713" }), _jsx("span", { className: "sr-only", children: t('읽음') })] })] }, p.id));
                    }), _jsxs("li", { className: "branch-box-fork", "aria-hidden": "true", children: [_jsx("span", { className: "branch-box-dot" }), t('main에서 갈라짐')] })] }), _jsxs("footer", { className: "branch-box-foot", children: [prev ? _jsx(Link, { to: prev.url, className: "btn btn-outline btn-small", "data-tip": prev.title, children: t('‹ 이전 글') }) : _jsx("span", {}), next ? _jsx(Link, { to: next.url, className: "btn btn-primary btn-small", "data-tip": next.title, children: t('다음 글 ›') }) : null] })] }));
}
