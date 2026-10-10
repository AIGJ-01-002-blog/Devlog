import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ReportButton } from './ReportButton';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { loginPath, useAuth } from '../lib/auth';
import { appendUnique, commentLength, commentsApi, countsTowardTotal, insertComment, MAX_COMMENT, removeComment, replaceComment, } from '../lib/comments';
import { fullDate, relativeDate } from '../lib/format';
import { Link } from '../lib/router';
import { Avatar } from './Avatar';
import { t } from '../lib/i18n';
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
        return _jsx("section", { className: "comments", children: _jsxs("p", { className: "feed-error", role: "alert", children: [t('댓글을 불러오지 못했어요'), " ", _jsx("button", { type: "button", className: "btn btn-text", onClick: load, children: t('다시 시도') })] }) });
    }
    if (!page)
        return _jsx("section", { className: "comments", children: _jsx("p", { className: "muted", children: t('댓글을 불러오는 중…') }) });
    const ctx = { postId, canWrite: page.canWrite, replyingTo, setReplyingTo, highlight, added, removed,
        updated: (c) => setItems((list) => replaceComment(list, c)), setItems };
    return (_jsxs("section", { className: "comments", id: "comments", "aria-labelledby": "comments-title", children: [_jsxs("h2", { id: "comments-title", className: "comments-title", children: [t('댓글'), " ", count] }), _jsx(WriteBox, { ctx: ctx }), page.prevCursor && (_jsx(MoreButton, { label: t('이전 댓글 보기'), loading: loadingMore === 'prev', failed: moreFailed === 'prev', onClick: () => more('prev') })), items.length === 0 ? _jsx("p", { className: "muted center", children: t('첫 댓글을 남겨 보세요') }) : (_jsx("ol", { className: "comment-list", children: items.map((c) => _jsx(CommentItem, { c: c, rootId: null, ctx: ctx }, c.id)) })), page.nextCursor && (_jsx(MoreButton, { label: t('댓글 더 보기'), loading: loadingMore === 'next', failed: moreFailed === 'next', onClick: () => more('next') }))] }));
}
function MoreButton({ label, loading, failed, onClick }) {
    if (failed)
        return _jsxs("p", { className: "feed-error small", role: "alert", children: [t('불러오지 못했어요'), " ", _jsx("button", { type: "button", className: "btn btn-text", onClick: onClick, children: t('다시 시도') })] });
    return (_jsx("div", { className: "more", children: _jsx("button", { type: "button", className: "btn btn-outline", disabled: loading, onClick: onClick, children: loading ? t('불러오는 중…') : label }) }));
}
/** 최상위 입력칸, 또는 비회원·인증 전 회원 안내 (FR-022). */
function WriteBox({ ctx }) {
    const { me } = useAuth();
    const [sent, setSent] = useState(false);
    const [resendFailed, setResendFailed] = useState(false);
    if (!me?.authenticated) {
        return _jsxs("p", { className: "comment-guest", children: [t('로그인하고 댓글을 남겨 보세요'), " ", _jsx(Link, { to: loginPath(), className: "btn btn-text", children: t('로그인') })] });
    }
    if (!me.emailVerified) {
        return (_jsxs("p", { className: "comment-guest", children: [t('이메일 인증 후 댓글을 쓸 수 있어요'), ' ', _jsx("button", { type: "button", className: "btn btn-text", disabled: sent, onClick: () => {
                        setResendFailed(false);
                        api('/api/auth/email/resend', { method: 'POST' }).then(() => setSent(true)).catch(() => setResendFailed(true));
                    }, children: sent ? t('보냈어요') : t('인증 메일 다시 보내기') }), resendFailed && _jsxs("small", { className: "error", role: "alert", children: ["  ", t('메일을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.')] })] }));
    }
    if (!ctx.canWrite)
        return null;
    return _jsx(Editor, { placeholder: t('댓글을 남겨 보세요'), submitLabel: t('등록'), busyLabel: t('등록 중…'), onSubmit: async (text) => ctx.added(await commentsApi.create(ctx.postId, text), null) });
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
            return setError(t('댓글 내용을 입력해 주세요.'));
        if (length > MAX_COMMENT)
            return setError(t('댓글은 {0}자까지 쓸 수 있어요.', { 0: MAX_COMMENT }));
        setBusy(true);
        setError(null);
        try {
            await onSubmit(text);
            setText('');
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : t('잠시 후 다시 시도해 주세요.'));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: "comment-editor", children: [_jsx("textarea", { ref: ref, value: text, placeholder: placeholder, rows: 3, "aria-label": placeholder, onChange: (e) => setText(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void submit();
                } } }), _jsxs("div", { className: "comment-editor-foot", children: [_jsxs("small", { className: length > MAX_COMMENT ? 'error' : 'muted', children: [length, " / ", MAX_COMMENT] }), error && _jsx("small", { className: "error", role: "alert", children: error }), _jsxs("span", { className: "row", children: [onCancel && _jsx("button", { type: "button", className: "btn btn-text", onClick: onCancel, disabled: busy, children: t('취소') }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: submit, disabled: busy, children: busy ? busyLabel : submitLabel })] })] })] }));
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
        if (!confirm(t('댓글을 지울까요? 되돌릴 수 없어요.')))
            return;
        setDeleting(true);
        setError(null);
        try {
            await commentsApi.remove(c.id);
            ctx.removed(c);
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : t('지우지 못했어요. 잠시 후 다시 시도해 주세요.'));
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
    return (_jsxs("li", { id: `comment-${c.id}`, className: `comment${isRoot ? '' : ' reply'}${ctx.highlight === c.id ? ' highlight' : ''}`, children: [_jsxs("div", { className: "comment-head", children: [c.author ? (_jsxs(_Fragment, { children: [_jsxs(Link, { to: `/@${c.author.handle}`, className: "comment-author", children: [_jsx(Avatar, { src: c.author.profileImageUrl, name: c.author.nickname, seed: c.author.handle, size: 28 }), _jsx("b", { children: c.author.nickname }), " ", _jsxs("span", { className: "muted", children: ["@", c.author.handle] })] }), c.author.isPostAuthor && _jsx("span", { className: "badge", children: t('작성자') })] })) : (_jsxs("span", { className: "comment-author muted", children: [_jsx("span", { className: "avatar-blank", "aria-hidden": "true" }), c.state === 'WITHDRAWN_AUTHOR' ? t('탈퇴한 사용자') : ''] })), c.author && (_jsxs("span", { className: "muted small", children: ["\u00B7 ", _jsx("time", { dateTime: c.createdAt, title: fullDate(c.createdAt), children: relativeDate(c.createdAt) }), c.edited && t(' · 수정됨')] }))] }), c.state === 'DELETED' && _jsx("p", { className: "comment-body muted", children: t('삭제된 댓글이에요') }), c.state === 'WITHDRAWN_AUTHOR' && _jsx("p", { className: "comment-body muted", children: t('탈퇴한 사용자의 댓글이에요') }), c.state === 'HIDDEN' && !c.mine && _jsx("p", { className: "comment-body muted", children: t('운영 정책에 따라 숨겨진 댓글이에요') }), c.state === 'HIDDEN' && c.mine && _jsx("p", { className: "small badge-warn badge", children: t('숨겨졌어요 (나만 보여요)') }), c.content != null && !editing && (_jsxs(_Fragment, { children: [c.replyTo && _jsx("p", { className: "comment-reply-to", children: c.replyTo.withdrawn ? t('탈퇴한 사용자에게') : t('@{0}에게', { 0: c.replyTo.nickname }) }), _jsx("p", { className: "comment-body", children: c.content })] })), editing && (_jsx(Editor, { initial: c.content ?? '', placeholder: t('댓글 고치기'), submitLabel: t('저장'), busyLabel: t('저장 중…'), autoFocus: true, onCancel: () => setEditing(false), onSubmit: async (text) => { ctx.updated(await commentsApi.update(c.id, text)); setEditing(false); } })), !editing && (_jsxs("div", { className: "comment-actions", children: [normal && ctx.canWrite && (_jsx("button", { type: "button", className: "btn btn-text", onClick: () => ctx.setReplyingTo(ctx.replyingTo === c.id ? null : c.id), children: t('답글') })), c.mine && normal && _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setEditing(true), children: t('수정') }), c.mine && (normal || c.state === 'HIDDEN') && (_jsx("button", { type: "button", className: "btn btn-text danger", onClick: remove, disabled: deleting, children: deleting ? t('지우는 중…') : t('삭제') })), !c.mine && normal && _jsx(ReportButton, { targetType: "COMMENT", targetId: c.id })] })), error && _jsx("p", { className: "error small", role: "alert", children: error }), ctx.replyingTo === c.id && (_jsx(Editor, { placeholder: t('답글을 남겨 보세요'), submitLabel: t('등록'), busyLabel: t('등록 중…'), autoFocus: true, onCancel: () => ctx.setReplyingTo(null), onSubmit: async (text) => ctx.added(await commentsApi.create(ctx.postId, text, c.id), rootId ?? c.id) })), isRoot && (c.replies?.length ?? 0) > 0 && (_jsx("ol", { className: "comment-list replies", children: c.replies.map((r) => _jsx(CommentItem, { c: r, rootId: c.id, ctx: ctx }, r.id)) })), isRoot && hiddenReplies > 0 && c.repliesNextCursor && (repliesFailed
                ? _jsxs("p", { className: "feed-error small", role: "alert", children: [t('불러오지 못했어요'), " ", _jsx("button", { type: "button", className: "btn btn-text", onClick: moreReplies, children: t('다시 시도') })] })
                : _jsx("button", { type: "button", className: "btn btn-text more-replies", disabled: loadingReplies, onClick: moreReplies, children: loadingReplies ? t('불러오는 중…') : t('답글 {0}개 더 보기', { 0: hiddenReplies }) }))] }));
}
