package com.team.blog.like.application;

import java.time.Instant;

/** 좋아요 사건 (docs/20 §3-3). 식별자와 시각만 담는다. 실제로 행이 생기거나 지워졌을 때만, 커밋 뒤에 받는다. */
public final class LikeEvents {
    private LikeEvents() {}

    public record PostLiked(long postId, long authorId, long likerId, Instant at) {}

    public record PostUnliked(long postId, long authorId, long likerId, Instant at) {}
}
