package com.team.blog.view.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.team.blog.shared.scheduling.JobLock;
import com.team.blog.shared.time.Times;

/**
 * 모아 둔 조회를 1분마다 post_view 행으로 옮긴다 (spec 013 FR-020~FR-024). 여러 서버 중 한 곳에서만 돈다.
 * 반영을 시작하면 모으는 해시를 통째로 "반영 중"으로 바꿔, 그 뒤 새 조회는 다음 차례로 간다(FR-021).
 * 글마다 넣은 뒤 바로 지워서 도중에 죽어도 남은 글만 다음 차례에 이어서 반영한다(FR-022).
 * post_view만 넣으므로 글의 수정 일자는 바뀌지 않는다(FR-024).
 */
@Component
public class ViewFlushJob {
    private static final Logger log = LoggerFactory.getLogger(ViewFlushJob.class);
    static final String PROCESSING = "view:processing";

    private final StringRedisTemplate redis;
    private final JdbcTemplate jdbc;
    private final JobLock lock;
    private final Clock clock;

    public ViewFlushJob(StringRedisTemplate redis, JdbcTemplate jdbc, JobLock lock, Clock clock) {
        this.redis = redis;
        this.jdbc = jdbc;
        this.lock = lock;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${blog.view.flush-interval:60s}", initialDelayString = "${blog.view.flush-interval:60s}")
    public void scheduled() {
        lock.runExclusively("view-flush", Duration.ofMinutes(5), this::flushAll);
    }

    /** @return 넣은 조회 행 수 */
    public int flushAll() {
        try {
            // 지난번에 다 못 옮긴 것이 있으면 그것부터, 없으면 지금 모인 것을 넘겨받는다
            if (!Boolean.TRUE.equals(redis.hasKey(PROCESSING)) && Boolean.TRUE.equals(redis.hasKey(ViewRecorder.PENDING))) {
                redis.rename(ViewRecorder.PENDING, PROCESSING);
            }
            Map<Object, Object> batch = redis.opsForHash().entries(PROCESSING);
            int inserted = 0;
            Timestamp now = Timestamp.from(Times.now(clock));
            for (Map.Entry<Object, Object> e : batch.entrySet()) {
                long postId = Long.parseLong(e.getKey().toString());
                int views = Integer.parseInt(e.getValue().toString());
                // 그 사이 완전 삭제된 글은 행이 생기지 않는다 (FR-023)
                inserted += jdbc.update("""
                        INSERT INTO post_view (post_id, viewed_at)
                        SELECT p.id, ? FROM post p, generate_series(1, ?) WHERE p.id = ?
                        """, now, views, postId);
                redis.opsForHash().delete(PROCESSING, e.getKey());
            }
            return inserted;
        } catch (RuntimeException e) {
            log.warn("조회수를 반영하지 못했습니다. 다음 차례에 이어서 합니다: {}", e.getMessage());
            return 0;
        }
    }
}
