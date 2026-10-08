package com.team.blog.view.application;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.shared.stats.Counts;

/** 관리자 페이지(062)의 조회수 집계. 조회는 1분마다 Redis에서 post_view로 옮겨지므로 마지막 1분은 아직 안 보일 수 있다. */
@Service
public class ViewStats {
    private final JdbcTemplate jdbc;

    public ViewStats(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long total() {
        return Counts.one(jdbc, "SELECT count(*) FROM post_view");
    }

    public Map<LocalDate, Long> byDay(Instant from) {
        return Counts.byDay(jdbc, """
                SELECT (viewed_at AT TIME ZONE 'Asia/Seoul')::date AS d, count(*) AS n
                FROM post_view WHERE viewed_at >= ? GROUP BY d
                """, from);
    }

    public Map<Long, Long> byPosts(List<Long> postIds) {
        return Counts.byKeys(jdbc, "SELECT post_id AS k, count(*) AS n FROM post_view WHERE post_id = ANY (?) GROUP BY k", postIds);
    }

    /** 기간 안에 많이 본 글 번호 → 조회수 (많은 순) */
    public List<Map.Entry<Long, Long>> top(Instant from, int limit) {
        return jdbc.query("""
                SELECT post_id, count(*) AS n FROM post_view WHERE viewed_at >= ?
                GROUP BY post_id ORDER BY n DESC, post_id DESC LIMIT ?
                """, (rs, i) -> Map.entry(rs.getLong("post_id"), rs.getLong("n")), Timestamp.from(from), limit);
    }
}
