package com.team.blog.comment.application;

import java.time.Instant;

/**
 * 댓글 사건 (docs/20 §3-2, 011 FR-017·FR-039). 트랜잭션 안에서 발행하고 받는 쪽(알림)은 커밋 뒤에 처리한다.
 * 내용·닉네임 같은 글자는 넣지 않는다. 수정은 사건이 없다.
 */
public final class CommentEvents {
    private CommentEvents() {}

    /**
     * @param rootId          답글이면 소속 최상위 댓글, 최상위면 null
     * @param rootAuthorId    소속 최상위 댓글의 작성자 (답글일 때)
     * @param replyToMemberId 답글에 답한 경우의 대상 회원
     */
    public record CommentCreated(long commentId, long postId, long postAuthorId, long authorId, Long rootId,
                                 Long rootAuthorId, Long replyToMemberId, Instant at) {}

    public record CommentDeleted(long commentId, long postId, long postAuthorId, long authorId, Long rootId, Instant at) {}
}
