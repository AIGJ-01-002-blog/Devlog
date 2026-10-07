import { api } from './api';
export const MAX_COMMENT = 1000;
export const commentsApi = {
    page: (postId, q = {}) => {
        const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v));
        const qs = params.toString();
        return api(`/api/posts/${postId}/comments${qs ? `?${qs}` : ''}`);
    },
    replies: (rootId, cursor) => api(`/api/comments/${rootId}/replies?cursor=${encodeURIComponent(cursor)}`),
    create: (postId, content, replyToCommentId) => api(`/api/posts/${postId}/comments`, { method: 'POST', body: { content, replyToCommentId } }),
    update: (id, content) => api(`/api/comments/${id}`, { method: 'PATCH', body: { content } }),
    remove: (id) => api(`/api/comments/${id}`, { method: 'DELETE' }),
};
/** 서버와 같은 글자 수 (코드 포인트, 이모지 하나 = 1자). */
export function commentLength(s) {
    return [...s.trim()].length;
}
/** 이어 붙일 때 이미 있는 댓글은 건너뛴다. */
export function appendUnique(list, more) {
    const seen = new Set(list.map((c) => c.id));
    return [...list, ...more.filter((c) => !seen.has(c.id))];
}
/** 새 댓글을 넣는다. 답글이면 그 최상위 아래 끝에. */
export function insertComment(list, c, rootId) {
    if (rootId == null)
        return appendUnique(list, [{ ...c, replies: c.replies ?? [], replyCount: c.replyCount ?? 0 }]);
    return list.map((r) => r.id !== rootId ? r : {
        ...r,
        replies: appendUnique(r.replies ?? [], [c]),
        replyCount: (r.replyCount ?? 0) + 1,
    });
}
export function replaceComment(list, c) {
    return list.map((r) => r.id === c.id ? { ...r, ...c, replies: r.replies, replyCount: r.replyCount, repliesNextCursor: r.repliesNextCursor }
        : { ...r, replies: r.replies?.map((x) => (x.id === c.id ? c : x)) ?? null });
}
/**
 * 서버의 삭제 규칙을 화면에 그대로 (FR-034·FR-035): 답글이 있는 최상위는 "삭제된 댓글이에요" 자리로,
 * 그 밖에는 빼고, 자리 아래 마지막 답글이 빠지면 자리도 뺀다.
 */
export function removeComment(list, id) {
    const out = [];
    for (const r of list) {
        if (r.id === id) {
            if ((r.replyCount ?? 0) > 0)
                out.push({ ...r, state: 'DELETED', content: null, author: null, replyTo: null, mine: false, edited: false });
            continue;
        }
        const replies = r.replies?.filter((x) => x.id !== id) ?? null;
        if (replies && r.replies && replies.length !== r.replies.length) {
            const count = (r.replyCount ?? 1) - 1;
            if (r.state === 'DELETED' && count === 0)
                continue;
            out.push({ ...r, replies, replyCount: count });
        }
        else
            out.push(r);
    }
    return out;
}
/** 지우면 보이는 댓글 수가 줄어드는지 (숨긴 댓글은 이미 빠져 있다). */
export function countsTowardTotal(c) {
    return c.state === 'NORMAL' || c.state === 'WITHDRAWN_AUTHOR';
}
