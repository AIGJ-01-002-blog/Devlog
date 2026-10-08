package com.team.blog.post.query;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.access.ReadablePost;
import com.team.blog.post.domain.PostStatus;

/**
 * 같은 작성자의 블로그 목록에서 앞뒤 글 (spec 040). 목록 조건을 SQL 한 곳(기준 글 CTE)에서만 판단해 Java로 다시 쓰지 않는다:
 * 지금 글이 그 목록에 없으면(비공개·숨김 등) 이웃도 없다.
 */
@Service
public class PostNeighborQuery {
    private final JdbcTemplate jdbc;

    public PostNeighborQuery(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Link(long id, String title, String url) {}

    /** @param prev 더 오래된 글, @param next 더 새 글 */
    public record Neighbors(Link prev, Link next) {}

    /** 읽기 판정 재료. 글이 없으면 비어 있다. */
    public Optional<ReadablePost> readable(long postId) {
        return jdbc.query("""
                SELECT p.author_id, p.status, p.visibility, p.deleted_at IS NOT NULL AS deleted,
                       p.hidden_at IS NOT NULL AS hidden, m.withdrawn_at IS NOT NULL AS withdrawn
                FROM post p JOIN member m ON m.id = p.author_id WHERE p.id = ?
                """, (rs, i) -> new ReadablePost(rs.getLong("author_id"), PostStatus.valueOf(rs.getString("status")),
                Visibility.valueOf(rs.getString("visibility")), rs.getBoolean("deleted"), rs.getBoolean("hidden"),
                rs.getBoolean("withdrawn")), postId).stream().findFirst();
    }

    /**
     * @param friendsView 친구 목록(published_at) 기준이면 true, 공개 목록(first_public_at) 기준이면 false
     */
    public Neighbors find(long postId, boolean friendsView) {
        String condition = friendsView ? PostAccessPolicy.FRIENDS_LIST_CONDITION : PostAccessPolicy.PUBLIC_LIST_CONDITION;
        String sort = friendsView ? "p.published_at" : "p.first_public_at";
        // 양쪽 모두 블로그 목록 인덱스(ix_post_blog / ix_post_blog_friends)를 한 칸씩만 읽는다
        String neighbor = "(SELECT %d AS dir, p.id, p.title, m.handle FROM a CROSS JOIN post p JOIN member m ON m.id = p.author_id"
                + " WHERE p.author_id = a.author_id AND " + condition
                + " AND (" + sort + ", p.id) %s (a.k, a.id) ORDER BY " + sort + " %s, p.id %s LIMIT 1)";
        String sql = "WITH a AS (SELECT p.author_id, " + sort + " AS k, p.id FROM post p JOIN member m ON m.id = p.author_id"
                + " WHERE p.id = ? AND " + condition + ") "
                + neighbor.formatted(0, "<", "DESC", "DESC") + " UNION ALL " + neighbor.formatted(1, ">", "ASC", "ASC");
        Link[] links = new Link[2];
        List<Object[]> rows = jdbc.query(sql, (rs, i) -> new Object[] {rs.getInt("dir"),
                new Link(rs.getLong("id"), rs.getString("title"), "/@" + rs.getString("handle") + "/posts/" + rs.getLong("id"))},
                postId);
        rows.forEach(r -> links[(int) r[0]] = (Link) r[1]);
        return new Neighbors(links[0], links[1]);
    }
}
