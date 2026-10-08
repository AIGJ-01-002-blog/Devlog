package com.team.blog.post.application;

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

import com.team.blog.shared.jdbc.Columns;
import com.team.blog.shared.scheduling.JobLock;
import com.team.blog.shared.time.Times;

/** 휴지통에 옮긴 지 30일 지난 글을 매일 한 번 완전 삭제한다 (007 FR-010). 여러 서버여도 JobLock으로 한 번만 돈다. */
@Component
public class TrashPurgeJob {
    private static final Logger log = LoggerFactory.getLogger(TrashPurgeJob.class);
    private final JdbcTemplate jdbc;
    private final PostTrashService trash;
    private final JobLock lock;
    private final Clock clock;

    public TrashPurgeJob(JdbcTemplate jdbc, PostTrashService trash, JobLock lock, Clock clock) {
        this.jdbc = jdbc;
        this.trash = trash;
        this.lock = lock;
        this.clock = clock;
    }

    @Scheduled(cron = "${blog.post.trash-purge-cron:0 30 4 * * *}", zone = "Asia/Seoul")
    public void scheduled() {
        lock.runExclusively("trash-purge", Duration.ofMinutes(30), this::run);
    }

    /** @return 지운 글 수 */
    public int run() {
        Instant cutoff = Times.now(clock).minus(PostTrashService.RETENTION);
        int purged = 0;
        while (true) {
            List<Long> ids = Columns.longs(jdbc,
                    "SELECT id FROM post WHERE deleted_at < ? ORDER BY deleted_at LIMIT 500", Timestamp.from(cutoff));
            int before = purged;
            for (long id : ids) {
                try {
                    if (trash.purgeExpired(id, cutoff)) purged++;
                } catch (RuntimeException e) {
                    log.warn("휴지통 글을 지우지 못했습니다 (post {}). 다음 차례에 다시 시도합니다: {}", id, e.getMessage());
                }
            }
            if (ids.size() < 500 || purged == before) break;
        }
        if (purged > 0) log.info("휴지통에서 30일 지난 글 {}개를 완전히 지웠습니다", purged);
        return purged;
    }
}
