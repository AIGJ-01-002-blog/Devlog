package com.team.blog.media;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.team.blog.shared.scheduling.JobLock;
import com.team.blog.shared.time.Times;

/**
 * 프로필 사진 정리 (005 FR-013): 올리고 저장하지 않은 사진은 24시간 뒤, 연결이 끊긴 이전 사진은 7일 뒤 지운다.
 * 지금 연결된 사진은 조건(연결 없음)에서 빠진다. DB 행을 먼저 지우고(RETURNING) 저장소 파일을 지운다:
 * 파일 삭제가 실패해도 DB가 없는 파일을 가리키는 일은 없다.
 */
@Component
public class ProfileImageCleanupJob {
    private static final Logger log = LoggerFactory.getLogger(ProfileImageCleanupJob.class);
    static final Duration UNSAVED_TTL = Duration.ofHours(24);
    static final Duration DETACHED_TTL = Duration.ofDays(7);
    private static final int BATCH = 500;

    private final JdbcTemplate jdbc;
    private final ProfileImages images;
    private final JobLock lock;
    private final Clock clock;

    public ProfileImageCleanupJob(JdbcTemplate jdbc, ProfileImages images, JobLock lock, Clock clock) {
        this.jdbc = jdbc;
        this.images = images;
        this.lock = lock;
        this.clock = clock;
    }

    @Scheduled(cron = "${blog.media.profile-cleanup-cron:0 17 * * * *}", zone = "Asia/Seoul")
    public void scheduled() {
        lock.runExclusively("profile-image-cleanup", Duration.ofMinutes(10), this::runOnce);
    }

    /** @return 지운 사진 수 */
    public int runOnce() {
        Instant now = Times.now(clock);
        int total = 0;
        while (true) {
            List<String> keys = jdbc.queryForList("""
                    DELETE FROM resource WHERE id IN (
                        SELECT r.id FROM resource r
                        WHERE r.storage_key LIKE 'profiles/%'
                          AND NOT EXISTS (SELECT 1 FROM member_profile_image p WHERE p.resource_id = r.id)
                          AND ((r.detached_at IS NULL AND r.created_at < ?) OR r.detached_at < ?)
                        ORDER BY r.id LIMIT ? FOR UPDATE SKIP LOCKED)
                    RETURNING storage_key
                    """, String.class, Timestamp.from(now.minus(UNSAVED_TTL)), Timestamp.from(now.minus(DETACHED_TTL)), BATCH);
            keys.forEach(images::deleteQuietly);
            total += keys.size();
            if (keys.size() < BATCH) break;
        }
        if (total > 0) log.info("프로필 사진 {}장을 정리했습니다.", total);
        return total;
    }
}
