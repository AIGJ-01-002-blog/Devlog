package com.team.blog.view.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.team.blog.shared.scheduling.JobLock;
import com.team.blog.shared.stats.Counts;
import com.team.blog.shared.time.Times;
import com.team.blog.shared.web.RateLimiter;

/**
 * 사이트 방문 기록 (spec 064). 화면을 처음 열 때마다 한 번 온다. 같은 사람은 하루 한 행으로 모으고(순방문자),
 * 30분 넘게 쉬었다가 다시 오면 방문 수만 하나 늘린다. 방문자 구분과 제외 규칙은 조회수(013)와 같다:
 * 운영진·로봇·미리 불러오기는 세지 않는다. 실패해도 화면에는 알리지 않는다.
 */
@Service
public class VisitRecorder {
    private static final Logger log = LoggerFactory.getLogger(VisitRecorder.class);
    static final Duration SESSION_GAP = Duration.ofMinutes(30);
    static final Duration RETENTION = Duration.ofDays(400);
    private static final int PER_MINUTE = 20;

    public enum Outcome { COUNTED, EXCLUDED, SKIPPED }

    private final JdbcTemplate jdbc;
    private final ViewRecorder views;
    private final RateLimiter rateLimiter;
    private final JobLock lock;
    private final Clock clock;

    public VisitRecorder(JdbcTemplate jdbc, ViewRecorder views, RateLimiter rateLimiter, JobLock lock, Clock clock) {
        this.jdbc = jdbc;
        this.views = views;
        this.rateLimiter = rateLimiter;
        this.lock = lock;
        this.clock = clock;
    }

    public Outcome record(ViewRecorder.Visit visit) {
        if (visit.admin() || visit.prefetch() || views.isBot(visit.userAgent())) return Outcome.EXCLUDED;
        // 처음 쿠키를 받는 비회원은 그 쿠키로 센다. 다음 방문이 같은 사람으로 이어진다
        String visitor = visit.memberId() == null && visit.issuedVisitorId() != null
                ? ViewRecorder.sha256("v:" + visit.issuedVisitorId()) : views.visitorKey(visit);
        if (visitor == null) return Outcome.SKIPPED;
        if (!rateLimiter.tryAcquire("visit:" + visitor, PER_MINUTE, Duration.ofMinutes(1))) return Outcome.EXCLUDED;
        Instant now = Times.now(clock);
        try {
            jdbc.update("""
                    INSERT INTO site_visit (day, visitor, member, visits, first_at, last_at) VALUES (?, ?, ?, 1, ?, ?)
                    ON CONFLICT (day, visitor) DO UPDATE SET
                        visits = site_visit.visits + CASE WHEN site_visit.last_at < EXCLUDED.last_at - ?::interval THEN 1 ELSE 0 END,
                        last_at = EXCLUDED.last_at
                    """, LocalDate.ofInstant(now, Counts.KST), visitor, visit.memberId() != null, Timestamp.from(now),
                    Timestamp.from(now), SESSION_GAP.toMinutes() + " minutes");
            return Outcome.COUNTED;
        } catch (RuntimeException e) {
            log.warn("방문 기록을 건너뜁니다: {}", e.getClass().getSimpleName());
            return Outcome.SKIPPED;
        }
    }

    @Scheduled(cron = "${blog.view.visit-purge-cron:0 40 4 * * *}", zone = "Asia/Seoul")
    public void scheduled() {
        lock.runExclusively("visit-purge", Duration.ofMinutes(10), this::purge);
    }

    /** @return 지운 행 수 */
    public int purge() {
        LocalDate cutoff = LocalDate.ofInstant(Times.now(clock).minus(RETENTION), Counts.KST);
        return jdbc.update("DELETE FROM site_visit WHERE day < ?", cutoff);
    }
}
