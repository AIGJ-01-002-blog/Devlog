package com.team.blog.follow.application;

import java.time.Instant;

/** 팔로우 사건 (016 FR-023, docs/20). 관계가 실제로 생기거나 지워졌을 때만 트랜잭션 안에서 내고, 받는 쪽은 커밋 뒤에 처리한다. */
public final class FollowEvents {
    private FollowEvents() {}

    public record Followed(long followerId, long followeeId, Instant at) {}

    public record Unfollowed(long followerId, long followeeId, Instant at) {}
}
