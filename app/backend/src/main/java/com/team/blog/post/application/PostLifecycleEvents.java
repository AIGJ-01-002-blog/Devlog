package com.team.blog.post.application;

import java.time.Instant;

/**
 * 글 삭제·복구 사건 (docs/20 §3, 007 FR-017). 상태가 실제로 바뀐 경우에만, 트랜잭션 안에서 발행하고
 * 받는 쪽은 커밋 뒤(@TransactionalEventListener)에 처리한다. 제목·본문 같은 글자는 넣지 않는다.
 */
public final class PostLifecycleEvents {
    private PostLifecycleEvents() {}

    public record PostTrashed(long postId, long authorId, Instant at) {}

    public record PostRestored(long postId, long authorId, Instant at) {}

    /** @param reason 영구 삭제(USER), 30일 경과(EXPIRED), 빈 임시글 바로 삭제(EMPTY), 탈퇴 정리(WITHDRAW, 020) */
    public record PostPurged(long postId, long authorId, Reason reason, Instant at) {}

    public enum Reason { USER, EXPIRED, EMPTY, WITHDRAW }
}
