package com.team.blog.moderation.application;

import java.time.Duration;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.shared.scheduling.JobLock;

/**
 * 처리된 지 30일이 지난 신고 사건의 스냅샷과 그 사건 신고의 설명을 비운다 (019 FR-038). 행·상태·사유·처리 일자는 남긴다.
 * 매일 05:10(KST) 한 서버에서만 돈다.
 */
@Component
public class ReportPurgeJob {
    private static final Logger log = LoggerFactory.getLogger(ReportPurgeJob.class);
    static final Duration KEEP = Duration.ofDays(30);

    private final JdbcTemplate jdbc;
    private final JobLock lock;
    private final TransactionTemplate tx;

    public ReportPurgeJob(JdbcTemplate jdbc, JobLock lock, TransactionTemplate tx) {
        this.jdbc = jdbc;
        this.lock = lock;
        this.tx = tx;
    }

    @Scheduled(cron = "${blog.report.purge-cron:0 10 5 * * *}", zone = "Asia/Seoul")
    public void scheduled() {
        lock.runExclusively("report-purge", Duration.ofMinutes(30), this::run);
    }

    /** @return 비운 사건 수. 두 UPDATE는 한 트랜잭션이다(예약 실행은 자기 호출이라 @Transactional이 걸리지 않아 직접 묶는다). */
    public int run() {
        return Objects.requireNonNullElse(tx.execute(s -> purge()), 0);
    }

    private int purge() {
        String old = "status <> 'PENDING' AND handled_at < now() - make_interval(days => " + KEEP.toDays() + ")";
        jdbc.update("UPDATE report SET detail = NULL WHERE detail IS NOT NULL AND case_id IN (SELECT id FROM report_case WHERE " + old + ")");
        int n = jdbc.update("UPDATE report_case SET snapshot_title = NULL, snapshot_content = NULL WHERE " + old
                + " AND (snapshot_title IS NOT NULL OR snapshot_content IS NOT NULL)");
        if (n > 0) log.info("처리된 지 {}일 지난 신고 사건 {}개의 스냅샷을 비웠습니다", KEEP.toDays(), n);
        return n;
    }
}
