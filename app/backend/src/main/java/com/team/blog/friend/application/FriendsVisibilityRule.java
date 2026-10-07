package com.team.blog.friend.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.access.ReadablePost;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.access.VisibilityRule;

/**
 * 친구에게만 공개 (docs/06 §6-3). 작성자와 보는 사람이 수락된 친구일 때만 읽는다.
 * 작성자 본인·삭제·숨김은 PostAccessPolicy가 먼저 거른다. 친구를 끊으면 그 순간부터 읽을 수 없다(행이 사라짐).
 */
@Component
public class FriendsVisibilityRule implements VisibilityRule {
    private final JdbcTemplate jdbc;

    public FriendsVisibilityRule(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Visibility visibility() {
        return Visibility.FRIENDS;
    }

    @Override
    public boolean canRead(ReadablePost post, Viewer viewer) {
        return viewer.memberId() != null && areFriends(jdbc, post.authorId(), viewer.memberId());
    }

    /** (작은 번호, 큰 번호) 한 행만 확인한다. 같은 사람이면 친구가 아니다. */
    public static boolean areFriends(JdbcTemplate jdbc, long a, long b) {
        if (a == b) return false;
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM friendship
                               WHERE member_a_id = ? AND member_b_id = ? AND status = 'ACCEPTED')
                """, Boolean.class, Math.min(a, b), Math.max(a, b)));
    }
}
