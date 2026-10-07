import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ReportButton } from './ReportButton';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { loginPath, useAuth } from '../lib/auth';
import { appendUnique, commentLength, commentsApi, countsTowardTotal, insertComment, MAX_COMMENT, removeComment, replaceComment, } from '../lib/comments';
import { fullDate, relativeDate } from '../lib/format';
import { Link } from '../lib/router';
import { Avatar } from './Avatar';
/**
 * 글 상세 아래 댓글 (docs/21 §3, spec 011). 첫 20개는 글과 함께 오고, [댓글 더 보기]·[답글 N개 더 보기]·[이전 댓글 보기]로
 * 이어 붙인다. 내용은 글자(텍스트 노드)로만 그리고 줄바꿈은 CSS(pre-line)로 살린다.
 * ?comment={id}로 들어오면 그 댓글까지 불러와 스크롤하고 잠깐 강조한다.
 */
export function Comments({ postId, initial, onCount }) {
    const target = new URLSearchParams(location.search).get('comment');
    const [page, setPage] = useState(target ? null : initial);
    const [items, setItems] = useState(target ? [] : initial?.items ?? []);
    const [error, setError] = useState(false);
    const [loadingMore, setLoadingMore] = useState(null);
    const [moreFailed, setMoreFailed] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [highlight, setHighlight] = useState(null);
    const load = () => {
        setError(false);
        commentsApi.page(postId, target ? { around: target } : {})
            .then((p) => {
            setPage(p);
            setItems(p.items);
            onCount(p.commentCount);
            if (target)
                setHighlight(Number(target));
        })
            .catch(() => setError(true));
    };
    useEffect(() => {
        if (!page)
            load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (highlight == null)
            return;
        const el = document.getElementById(`comment-${highlight}`);
        el?.scrollIntoView({ block: 'center' });
        const t = setTimeout(() => setHighlight(null), 2500);
        return () => clearTimeout(t);
    }, [highlight]);
    const more = async (dir) => {
        if (!page)
            return;
        setLoadingMore(dir);
        setMoreFailed(null);
        try {
            const p = await commentsApi.page(postId, dir === 'next' ? { cursor: page.nextCursor } : { before: page.prevCursor });
            if (dir === 'next') {
                setItems((list) => appendUnique(list, p.items));
                setPage({ ...page, nextCursor: p.nextCursor });
            }
            else {
                setItems((list) => appendUnique(p.items, list));
                setPage({ ...page, prevCursor: p.prevCursor });
            }
        }
        catch {
            setMoreFailed(dir);
        }
        finally {
            setLoadingMore(null);
        }
    };
    const count = page?.commentCount ?? 0;
    const setCount = (n) => {
        if (page)
            setPage({ ...page, commentCount: n });
        onCount(n);
    };
    const added = (c, rootId) => {
        setItems((list) => insertComment(list, c, rootId));
        setCount(count + 1);
        setReplyingTo(null);
        setHighlight(c.id);
    };
    const removed = (c) => {
        setItems((list) => removeComment(list, c.id));
        if (countsTowardTotal(c))
            setCount(Math.max(0, count - 1));
    };
    if (error) {
        return _jsx("section", { className: "comments", children: _jsxs("p", { className: "feed-error", children: ["\uB313\uAE00\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694 ", _jsx("button", { type: "button", className: "btn btn-text", onClick: load, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] }) });
    }
    if (!page)
        return _jsx("section", { className: "comments", children: _jsx("p", { className: "muted", children: "\uB313\uAE00\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    const ctx = { postId, canWrite: page.canWrite, replyingTo, setReplyingTo, highlight, added, removed,
        updated: (c) => setItems((list) => replaceComment(list, c)), setItems };
    return (_jsxs("section", { className: "comments", "aria-labelledby": "comments-title", children: [_jsxs("h2", { id: "comments-title", className: "comments-title", children: ["\uB313\uAE00 ", count] }), _jsx(WriteBox, { ctx: ctx }), page.prevCursor && (_jsx(MoreButton, { label: "\uC774\uC804 \uB313\uAE00 \uBCF4\uAE30", loading: loadingMore === 'prev', failed: moreFailed === 'prev', onClick: () => more('prev') })), items.length === 0 ? _jsx("p", { className: "muted center", children: "\uCCAB \uB313\uAE00\uC744 \uB0A8\uACA8 \uBCF4\uC138\uC694" }) : (_jsx("ol", { className: "comment-list", children: items.map((c) => _jsx(CommentItem, { c: c, rootId: null, ctx: ctx }, c.id)) })), page.nextCursor && (_jsx(MoreButton, { label: "\uB313\uAE00 \uB354 \uBCF4\uAE30", loading: loadingMore === 'next', failed: moreFailed === 'next', onClick: () => more('next') }))] }));
}
function MoreButton({ label, loading, failed, onClick }) {
    if (failed)
        return _jsxs("p", { className: "feed-error small", children: ["\uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694 ", _jsx("button", { type: "button", className: "btn btn-text", onClick: onClick, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] });
    return (_jsx("div", { className: "more", children: _jsx("button", { type: "button", className: "btn btn-outline", disabled: loading, onClick: onClick, children: loading ? '불러오는 중…' : label }) }));
}
/** 최상위 입력칸, 또는 비회원·인증 전 회원 안내 (FR-022). */
function WriteBox({ ctx }) {
    const { me } = useAuth();
    const [sent, setSent] = useState(false);
    if (!me?.authenticated) {
        return _jsxs("p", { className: "comment-guest", children: ["\uB85C\uADF8\uC778\uD558\uACE0 \uB313\uAE00\uC744 \uB0A8\uACA8 \uBCF4\uC138\uC694 ", _jsx(Link, { to: loginPath(), className: "btn btn-text", children: "\uB85C\uADF8\uC778" })] });
    }
    if (!me.emailVerified) {
        return (_jsxs("p", { className: "comment-guest", children: ["\uC774\uBA54\uC77C \uC778\uC99D \uD6C4 \uB313\uAE00\uC744 \uC4F8 \uC218 \uC788\uC5B4\uC694", ' ', _jsx("button", { type: "button", className: "btn btn-text", disabled: sent, onClick: () => api('/api/auth/email/resend', { method: 'POST' }).then(() => setSent(true)).catch(() => undefined), children: sent ? '보냈어요' : '인증 메일 다시 보내기' })] }));
    }
    if (!ctx.canWrite)
        return null;
    return _jsx(Editor, { placeholder: "\uB313\uAE00\uC744 \uB0A8\uACA8 \uBCF4\uC138\uC694", submitLabel: "\uB4F1\uB85D", busyLabel: "\uB4F1\uB85D \uC911\u2026", onSubmit: async (text) => ctx.added(await commentsApi.create(ctx.postId, text), null) });
}
/** 쓰기·답글·수정이 같이 쓰는 입력칸. 실패하면 입력한 내용을 그대로 두고 이유를 보여 준다. */
function Editor({ initial = '', placeholder, submitLabel, busyLabel, onSubmit, onCancel, autoFocus }) {
    const [text, setText] = useState(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const ref = useRef(null);
    useEffect(() => { if (autoFocus)
        ref.current?.focus(); }, [autoFocus]);
    const length = commentLength(text);
    const submit = async () => {
        if (busy)
            return;
        if (length === 0)
            return setError('댓글 내용을 입력해 주세요.');
        if (length > MAX_COMMENT)
            return setError(`댓글은 ${MAX_COMMENT}자까지 쓸 수 있어요.`);
        setBusy(true);
        setError(null);
        try {
            await onSubmit(text);
            setText('');
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : '잠시 후 다시 시도해 주세요.');
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: "comment-editor", children: [_jsx("textarea", { ref: ref, value: text, placeholder: placeholder, rows: 3, "aria-label": placeholder, onChange: (e) => setText(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void submit();
                } } }), _jsxs("div", { className: "comment-editor-foot", children: [_jsxs("small", { className: length > MAX_COMMENT ? 'error' : 'muted', children: [length, " / ", MAX_COMMENT] }), error && _jsx("small", { className: "error", role: "alert", children: error }), _jsxs("span", { className: "row", children: [onCancel && _jsx("button", { type: "button", className: "btn btn-text", onClick: onCancel, disabled: busy, children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: submit, disabled: busy, children: busy ? busyLabel : submitLabel })] })] })] }));
}
function CommentItem({ c, rootId, ctx }) {
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [repliesFailed, setRepliesFailed] = useState(false);
    const [error, setError] = useState(null);
    const normal = c.state === 'NORMAL';
    const isRoot = rootId == null;
    const remove = async () => {
        if (!confirm('댓글을 지울까요? 되돌릴 수 없어요.'))
            return;
        setDeleting(true);
        setError(null);
        try {
            await commentsApi.remove(c.id);
            ctx.removed(c);
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : '지우지 못했어요. 잠시 후 다시 시도해 주세요.');
            setDeleting(false);
        }
    };
    const moreReplies = async () => {
        setLoadingReplies(true);
        setRepliesFailed(false);
        try {
            const r = await commentsApi.replies(c.id, c.repliesNextCursor);
            ctx.setItems((list) => list.map((x) => x.id !== c.id ? x
                : { ...x, replies: appendUnique(x.replies ?? [], r.items), repliesNextCursor: r.nextCursor }));
        }
        catch {
            setRepliesFailed(true);
        }
        finally {
            setLoadingReplies(false);
        }
    };
    const shown = c.replies?.length ?? 0;
    const hiddenReplies = (c.replyCount ?? 0) - shown;
    return (_jsxs("li", { id: `comment-${c.id}`, className: `comment${isRoot ? '' : ' reply'}${ctx.highlight === c.id ? ' highlight' : ''}`, children: [_jsxs("div", { className: "comment-head", children: [c.author ? (_jsxs(_Fragment, { children: [_jsxs(Link, { to: `/@${c.author.handle}`, className: "comment-author", children: [_jsx(Avatar, { src: c.author.profileImageUrl, name: c.author.nickname, seed: c.author.handle, size: 28 }), _jsx("b", { children: c.author.nickname }), " ", _jsxs("span", { className: "muted", children: ["@", c.author.handle] })] }), c.author.isPostAuthor && _jsx("span", { className: "badge", children: "\uC791\uC131\uC790" })] })) : (_jsxs("span", { className: "comment-author muted", children: [_jsx("span", { className: "avatar-blank", "aria-hidden": "true" }), c.state === 'WITHDRAWN_AUTHOR' ? '탈퇴한 사용자' : ''] })), c.author && (_jsxs("span", { className: "muted small", children: ["\u00B7 ", _jsx("time", { dateTime: c.createdAt, title: fullDate(c.createdAt), children: relativeDate(c.createdAt) }), c.edited && ' · 수정됨'] }))] }), c.state === 'DELETED' && _jsx("p", { className: "comment-body muted", children: "\uC0AD\uC81C\uB41C \uB313\uAE00\uC774\uC5D0\uC694" }), c.state === 'WITHDRAWN_AUTHOR' && _jsx("p", { className: "comment-body muted", children: "\uD0C8\uD1F4\uD55C \uC0AC\uC6A9\uC790\uC758 \uB313\uAE00\uC774\uC5D0\uC694" }), c.state === 'HIDDEN' && !c.mine && _jsx("p", { className: "comment-body muted", children: "\uC6B4\uC601 \uC815\uCC45\uC5D0 \uB530\uB77C \uC228\uACA8\uC9C4 \uB313\uAE00\uC774\uC5D0\uC694" }), c.state === 'HIDDEN' && c.mine && _jsx("p", { className: "small badge-warn badge", children: "\uC228\uACA8\uC84C\uC5B4\uC694 (\uB098\uB9CC \uBCF4\uC5EC\uC694)" }), c.content != null && !editing && (_jsxs(_Fragment, { children: [c.replyTo && _jsx("p", { className: "comment-reply-to", children: c.replyTo.withdrawn ? '탈퇴한 사용자에게' : `@${c.replyTo.nickname}에게` }), _jsx("p", { className: "comment-body", children: c.content })] })), editing && (_jsx(Editor, { initial: c.content ?? '', placeholder: "\uB313\uAE00 \uACE0\uCE58\uAE30", submitLabel: "\uC800\uC7A5", busyLabel: "\uC800\uC7A5 \uC911\u2026", autoFocus: true, onCancel: () => setEditing(false), onSubmit: async (text) => { ctx.updated(await commentsApi.update(c.id, text)); setEditing(false); } })), !editing && (_jsxs("div", { className: "comment-actions", children: [normal && ctx.canWrite && (_jsx("button", { type: "button", className: "btn btn-text", onClick: () => ctx.setReplyingTo(ctx.replyingTo === c.id ? null : c.id), children: "\uB2F5\uAE00" })), c.mine && normal && _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setEditing(true), children: "\uC218\uC815" }), c.mine && (normal || c.state === 'HIDDEN') && (_jsx("button", { type: "button", className: "btn btn-text danger", onClick: remove, disabled: deleting, children: deleting ? '지우는 중…' : '삭제' })), !c.mine && normal && _jsx(ReportButton, { targetType: "COMMENT", targetId: c.id })] })), error && _jsx("p", { className: "error small", role: "alert", children: error }), ctx.replyingTo === c.id && (_jsx(Editor, { placeholder: "\uB2F5\uAE00\uC744 \uB0A8\uACA8 \uBCF4\uC138\uC694", submitLabel: "\uB4F1\uB85D", busyLabel: "\uB4F1\uB85D \uC911\u2026", autoFocus: true, onCancel: () => ctx.setReplyingTo(null), onSubmit: async (text) => ctx.added(await commentsApi.create(ctx.postId, text, c.id), rootId ?? c.id) })), isRoot && (c.replies?.length ?? 0) > 0 && (_jsx("ol", { className: "comment-list replies", children: c.replies.map((r) => _jsx(CommentItem, { c: r, rootId: c.id, ctx: ctx }, r.id)) })), isRoot && hiddenReplies > 0 && c.repliesNextCursor && (repliesFailed
                ? _jsxs("p", { className: "feed-error small", children: ["\uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694 ", _jsx("button", { type: "button", className: "btn btn-text", onClick: moreReplies, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] })
                : _jsx("button", { type: "button", className: "btn btn-text more-replies", disabled: loadingReplies, onClick: moreReplies, children: loadingReplies ? '불러오는 중…' : `답글 ${hiddenReplies}개 더 보기` }))] }));
}
