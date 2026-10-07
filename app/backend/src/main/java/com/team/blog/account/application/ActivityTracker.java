package com.team.blog.account.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.shared.time.Times;

/**
 * 최근 활동 일자 갱신 (008 FR-007, docs/07 §6). 로그인한 요청마다 부르지만 DB 쓰기는 회원당 한 시간에 한 번이다.
 * Redis 키로 먼저 거르고, Redis가 멈추면 DB 조건(한 시간 지난 경우만)으로 거른다. 실패해도 요청은 막지 않는다.
 */
@Component
public class ActivityTracker {
    static final Duration INTERVAL = Duration.ofHours(1);
    private static final Logger log = LoggerFactory.getLogger(ActivityTracker.class);

    private final StringRedisTemplate redis;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public ActivityTracker(StringRedisTemplate redis, JdbcTemplate jdbc, Clock clock) {
        this.redis = redis;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public void touch(long memberId) {
        try {
            if (!Boolean.TRUE.equals(redis.opsForValue().setIfAbsent("active:" + memberId, "1", INTERVAL))) return;
        } catch (RuntimeException e) {
            // Redis 장애: 아래 DB 조건만으로 거른다
        }
        try {
            Instant now = Times.now(clock);
            jdbc.update("UPDATE member SET last_active_at = ? WHERE id = ? AND (last_active_at IS NULL OR last_active_at < ?)",
                    Timestamp.from(now), memberId, Timestamp.from(now.minus(INTERVAL)));
        } catch (RuntimeException e) {
            log.warn("최근 활동 일자를 갱신하지 못했습니다 (member {}): {}", memberId, e.getMessage());
        }
    }
}
