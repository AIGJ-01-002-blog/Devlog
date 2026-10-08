package com.team.blog.revision.application;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.shared.error.NotFoundException;

/**
 * 글 수정 이력 읽기 (054). 작성자 본인만 본다. 남의 글·없는 글·휴지통 글은 모두 404다 (헌법 II).
 * 되돌리기는 서버에 따로 두지 않는다. 편집기가 판 내용을 불러와 평소처럼 저장·다시 발행한다(작업본·버전 규칙 그대로).
 */
@Service
public class PostRevisionQuery {
    private final JdbcTemplate jdbc;

    public PostRevisionQuery(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 목록 한 줄. 본문 대신 글자 수만 보낸다. */
    public record Item(int no, String title, Instant createdAt, int length) {}

    public record Detail(int no, String title, String contentMd, String summary, Instant createdAt) {}

    public List<Item> list(long memberId, long postId) {
        requireOwn(memberId, postId);
        return jdbc.query("""
                SELECT revision_no, title, created_at, char_length(content_md) AS len
                FROM post_revision WHERE post_id = ? ORDER BY revision_no DESC
                """, (rs, i) -> new Item(rs.getInt("revision_no"), rs.getString("title"),
                rs.getTimestamp("created_at").toInstant(), rs.getInt("len")), postId);
    }

    public Detail get(long memberId, long postId, int no) {
        requireOwn(memberId, postId);
        return jdbc.query("""
                SELECT revision_no, title, content_md, summary, created_at
                FROM post_revision WHERE post_id = ? AND revision_no = ?
                """, (rs, i) -> new Detail(rs.getInt("revision_no"), rs.getString("title"), rs.getString("content_md"),
                rs.getString("summary"), rs.getTimestamp("created_at").toInstant()), postId, no)
                .stream().findFirst().orElseThrow(NotFoundException::new);
    }

    private void requireOwn(long memberId, long postId) {
        Optional<Long> found = jdbc.query("SELECT id FROM post WHERE id = ? AND author_id = ? AND deleted_at IS NULL",
                (rs, i) -> rs.getLong(1), postId, memberId).stream().findFirst();
        if (found.isEmpty()) throw new NotFoundException();
    }
}
