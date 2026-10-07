package com.team.blog.post.application;

import java.time.Instant;

import com.team.blog.account.domain.Visibility;

/**
 * 글 도메인 사건 (docs/20). 알림·검색 색인·sitemap 등은 이 사건을 듣는 리스너로 붙인다 (헌법 IV).
 * 발행 계열 사건은 커밋 후(@TransactionalEventListener AFTER_COMMIT)에 처리한다.
 */
public final class PostEvents {
    private PostEvents() {}

    /** 최초 발행. version은 발행으로 확정된 편집 버전 (Redis 자동 저장 키 정리 기준). */
    public record PostPublished(long postId, long authorId, Visibility visibility, long version, Instant at) {}

    /** 다시 발행. */
    public record PostEdited(long postId, long authorId, Visibility visibility, long version, Instant at) {}

    /** 공개 범위만 바뀜 (다시 발행 아님). */
    public record PostVisibilityChanged(long postId, long authorId, Visibility from, Visibility to, Instant at) {}
}
