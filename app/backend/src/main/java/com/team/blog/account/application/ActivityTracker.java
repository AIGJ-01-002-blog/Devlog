package com.team.blog.account.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.team.blog.shared.scheduling.JobLock;
import com.team.blog.shared.stats.Counts;
import com.team.blog.shared.time.Times;

/**
 * 최근 활동 일자 갱신 (008 FR-007, docs/07 §6). 로그인한 요청마다 부르지만 DB 쓰기는 회원당 한 시간에 한 번이다.
 * Redis 키로 먼저 거르고, Redis가 멈추면 DB 조건(한 시간 지난 경우만)으로 거른다. 실패해도 요청은 막지 않는다.
 * 활동한 날(한국 날짜)도 회원당 하루 한 행으로 남긴다(spec 066, 관리자 대시보드의 날짜별 활동한 회원).
 */
@Component
public class ActivityTracker {
    static final Duration INTERVAL = Duration.ofHours(1);
    static final Duration DAY_RETENTION = Duration.ofDays(400);
    private static final Logger log = LoggerFactory.getLogger(ActivityTracker.class);

    private final StringRedisTemplate redis;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final JobLock lock;

    public ActivityTracker(StringRedisTemplate redis, JdbcTemplate jdbc, Clock clock, JobLock lock) {
        this.redis = redis;
        this.jdbc = jdbc;
        this.clock = clock;
        this.lock = lock;
    }

    public void touch(long memberId) {
        markDay(memberId);
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

    /** 오늘(한국 날짜) 활동한 회원으로 남긴다. Redis 키로 하루 한 번만 쓰고, Redis가 멈추면 겹쳐도 무시되는 INSERT만 한다 */
    private void markDay(long memberId) {
        LocalDate today = LocalDate.ofInstant(Times.now(clock), Counts.KST);
        try {
            if (!Boolean.TRUE.equals(redis.opsForValue().setIfAbsent("active-day:" + memberId + ":" + today, "1", Duration.ofHours(25)))) return;
        } catch (RuntimeException e) {
            // Redis 장애: 아래 INSERT가 겹치면 그냥 무시된다
        }
        try {
            jdbc.update("INSERT INTO member_active_day (member_id, day) VALUES (?, ?) ON CONFLICT DO NOTHING", memberId, today);
        } catch (RuntimeException e) {
            log.warn("활동한 날을 남기지 못했습니다 (member {}): {}", memberId, e.getMessage());
        }
    }

    @Scheduled(cron = "${blog.account.active-day-purge-cron:0 45 4 * * *}", zone = "Asia/Seoul")
    public void scheduled() {
        lock.runExclusively("active-day-purge", Duration.ofMinutes(10), this::purge);
    }

    /** @return 지운 행 수 */
    public int purge() {
        LocalDate cutoff = LocalDate.ofInstant(Times.now(clock).minus(DAY_RETENTION), Counts.KST);
        return jdbc.update("DELETE FROM member_active_day WHERE day < ?", cutoff);
    }
}
