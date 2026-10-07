package com.team.blog.follow.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.time.Times;

/**
 * 팔로우 (016 US1). 뒤집기가 아니라 상태 지정이라 같은 요청을 몇 번 보내도 결과가 같다(FR-004).
 * (팔로우한 사람, 받은 사람)이 기본 키라 동시에 보내도 관계는 하나이고, 문장이 실제로 행을 바꿨을 때만 사건을 낸다(FR-005·FR-023).
 */
@Service
public class FollowService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public FollowService(JdbcTemplate jdbc, TransactionTemplate tx, ApplicationEventPublisher events, Clock clock) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.events = events;
        this.clock = clock;
    }

    public record State(boolean following, long followerCount) {}

    public State set(long me, String handle, boolean follow) {
        long target = FollowQuery.activeMember(jdbc, handle).orElseThrow(NotFoundException::new);
        if (target == me) throw ApiException.badRequest("FOLLOW_SELF", "자기 자신은 팔로우할 수 없어요.");
        Instant now = Times.now(clock);
        tx.executeWithoutResult(s -> {
            int changed = follow
                    ? jdbc.update("INSERT INTO follow (follower_id, followee_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                            me, target, Timestamp.from(now))
                    : jdbc.update("DELETE FROM follow WHERE follower_id = ? AND followee_id = ?", me, target);
            if (changed == 1) {
                events.publishEvent(follow ? new FollowEvents.Followed(me, target, now) : new FollowEvents.Unfollowed(me, target, now));
            }
        });
        Long followers = jdbc.queryForObject(FollowQuery.FOLLOWER_COUNT, Long.class, target);
        return new State(follow, followers == null ? 0 : followers);
    }
}
