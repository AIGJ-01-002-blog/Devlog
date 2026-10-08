package com.team.blog.post.query;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.shared.jdbc.Columns;

/**
 * 작성자 본인 기준으로 휴지통에 없는 글을 읽는다 (055 수정 이력의 본인 확인, 056 내보내기).
 * 다른 모듈은 post 테이블을 읽지 않고 이 서비스를 쓴다 (헌법 IV).
 */
@Service
public class AuthorPostQuery {
    private final JdbcTemplate jdbc;

    public AuthorPostQuery(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 내보내기 한 편. 발행한 글은 발행본, 임시글은 마지막 저장본이다. */
    public record Source(long id, String title, String contentMd, String summary, String status, String visibility,
                         Instant createdAt, Instant publishedAt, Instant editedAt) {}

    /** 휴지통에 없는 내 글인가. 남의 글·없는 글·휴지통 글은 모두 false다. */
    public boolean owns(long memberId, long postId) {
        return !Columns.longs(jdbc, "SELECT id FROM post WHERE id = ? AND author_id = ? AND deleted_at IS NULL", postId, memberId)
                .isEmpty();
    }

    public int liveCount(long memberId) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM post WHERE author_id = ? AND deleted_at IS NULL", Integer.class, memberId);
        return n == null ? 0 : n;
    }

    /** 휴지통에 없는 내 글 전부. 발행일(없으면 만든 날) 오래된 순. */
    public List<Source> all(long memberId) {
        return jdbc.query("""
                SELECT id, title, content_md, summary, status, visibility, created_at, published_at, edited_at
                FROM post WHERE author_id = ? AND deleted_at IS NULL
                ORDER BY COALESCE(published_at, created_at), id
                """, (rs, i) -> new Source(rs.getLong("id"), rs.getString("title"), rs.getString("content_md"),
                rs.getString("summary"), rs.getString("status"), rs.getString("visibility"),
                instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("published_at")),
                instant(rs.getTimestamp("edited_at"))), memberId);
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
