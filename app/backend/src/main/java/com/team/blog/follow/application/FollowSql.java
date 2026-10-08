package com.team.blog.follow.application;

import com.team.blog.post.query.PostFilter;

/** 글 목록에 더하는 팔로우 조건 (follow 테이블은 이 모듈만 안다). */
public final class FollowSql {
    private FollowSql() {}

    /** 이 사람이 팔로우한 작성자의 글만 (016 US2). 요청마다 다시 읽어 언팔로우가 다음 요청부터 반영된다(FR-019). */
    public static PostFilter authorFollowedBy(long followerId) {
        return new PostFilter("p.author_id IN (SELECT f.followee_id FROM follow f WHERE f.follower_id = ?)", followerId);
    }
}
