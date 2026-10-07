package com.team.blog.notification.application;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.team.blog.shared.scheduling.JobLock;

/**
 * 알림 보관 정리 (015 FR-037·FR-038, docs/25 §6): 매일 새벽 한 서버에서 90일 지난 알림을 1,000개씩 지우고,
 * 최근 하루 동안 알림이 생긴 사람만 골라 최신 1,000개를 넘는 오래된 알림을 지운다. 묶음 참여자는 FK로 함께 지워진다.
 */
@Component
public class NotificationCleanupJob {
    private static final Logger log = LoggerFactory.getLogger(NotificationCleanupJob.class);
    static final int BATCH = 1000;

    private final JdbcTemplate jdbc;
    private final JobLock lock;
    private final Duration retention;
    private final int maxPerMember;

    public NotificationCleanupJob(JdbcTemplate jdbc, JobLock lock,
                                  @Value("${blog.notification.retention:90d}") Duration retention,
                                  @Value("${blog.notification.max-per-member:1000}") int maxPerMember) {
        this.jdbc = jdbc;
        this.lock = lock;
        this.retention = retention;
        this.maxPerMember = maxPerMember;
    }

    @Scheduled(cron = "${blog.notification.cleanup-cron:0 30 4 * * *}", zone = "Asia/Seoul")
    public void scheduled() {
        lock.runExclusively("notification-cleanup", Duration.ofMinutes(30), this::run);
    }

    /** @return 지운 알림 수 */
    public int run() {
        int total = 0;
        int n;
        do {
            n = jdbc.update("""
                    DELETE FROM notification WHERE id IN (
                        SELECT id FROM notification WHERE updated_at < now() - make_interval(secs => ?) LIMIT ?)
                    """, retention.toSeconds(), BATCH);
            total += n;
        } while (n == BATCH);
        total += jdbc.update("""
                DELETE FROM notification d USING (
                    SELECT id FROM (
                        SELECT n.id, row_number() OVER (PARTITION BY n.receiver_id ORDER BY n.updated_at DESC, n.id DESC) AS rn
                        FROM notification n
                        WHERE n.receiver_id IN (SELECT DISTINCT receiver_id FROM notification WHERE created_at >= now() - interval '1 day')
                    ) ranked WHERE rn > ?) old
                WHERE d.id = old.id
                """, maxPerMember);
        if (total > 0) log.info("알림 {}개를 정리했습니다", total);
        return total;
    }
}
