package com.team.blog.like.application;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.friend.application.FriendSql;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.shared.cursor.CursorCodec;
import com.team.blog.shared.time.Times;

/** 좋아요 읽기 (post_like 테이블은 이 모듈만 안다). */
@Service
public class LikeQuery {
    private final JdbcTemplate jdbc;
    private final CursorCodec cursors;

    public LikeQuery(JdbcTemplate jdbc, CursorCodec cursors) {
        this.jdbc = jdbc;
        this.cursors = cursors;
    }

    /** 글 번호 한 쪽과 다음 쪽 커서. */
    public record PostIdPage(List<Long> postIds, String nextCursor) {}

    /** 글 상세가 처음 열릴 때 "내가 눌렀는지" (012 FR-015, PK 조회 1번). */
    public boolean likedBy(long memberId, long postId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM post_like WHERE post_id = ? AND member_id = ?)",
                Boolean.class, postId, memberId));
    }

    /**
     * 좋아한 글 번호 (027 US1): 좋아요를 누른 최신순. 지금 읽을 수 있는 글만(공개 글, 친구 공개 글은 아직 친구일 때).
     * 순서·커서는 좋아요 행으로 정한다(ix_post_like_member).
     */
    public PostIdPage likedPosts(long memberId, String cursor, int size) {
        String listName = "liked:" + memberId;
        StringBuilder sql = new StringBuilder("""
                SELECT l.post_id, l.created_at FROM post_like l JOIN post p ON p.id = l.post_id JOIN member m ON m.id = p.author_id
                WHERE l.member_id = ? AND """).append(' ').append(PostAccessPolicy.FRIENDS_LIST_CONDITION)
                .append(" AND (p.visibility = 'PUBLIC' OR ").append(FriendSql.acceptedFriends("p.author_id", "l.member_id")).append(')');
        List<Object> args = new ArrayList<>(List.of(memberId));
        if (cursor != null && !cursor.isBlank()) {
            long[] k = cursors.decode(cursor, listName, 2);
            sql.append(" AND (l.created_at, l.post_id) < (?, ?)");
            args.add(Timestamp.from(Times.fromEpochMicros(k[0])));
            args.add(k[1]);
        }
        sql.append(" ORDER BY l.created_at DESC, l.post_id DESC LIMIT ").append(size + 1);
        List<long[]> rows = jdbc.query(sql.toString(), (rs, i) -> new long[] {rs.getLong(1),
                Times.toEpochMicros(rs.getTimestamp(2).toInstant())}, args.toArray());
        CursorCodec.Page<long[]> page = CursorCodec.page(rows, size, r -> cursors.encode(listName, r[1], r[0]));
        return new PostIdPage(page.items().stream().map(r -> r[0]).toList(), page.nextCursor());
    }
}
