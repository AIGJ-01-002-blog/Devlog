package com.team.blog.discovery.application;

import java.util.List;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.account.domain.Visibility;
import com.team.blog.friend.application.FriendsVisibilityRule;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.access.ReadablePost;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.domain.PostStatus;

/**
 * 글 상세 아래의 이전·다음 글 (spec 040). 보는 사람이 그 작성자의 블로그 목록에서 보는 순서를 그대로 따른다:
 * 친구면 친구 목록(published_at), 아니면 공개 목록(first_public_at). 작성자 본인도 블로그처럼 공개 목록 기준이다 (spec 003 FR-021).
 * 지금 글이 그 목록에 없으면(비공개·숨김 등) 이웃도 없다. 목록 조건을 SQL 한 곳(기준 글 CTE)에서만 판단해 Java로 다시 쓰지 않는다.
 */
@Service
public class AdjacentPostQuery {
    private final JdbcTemplate jdbc;
    private final PostAccessPolicy policy;

    public AdjacentPostQuery(JdbcTemplate jdbc, PostAccessPolicy policy) {
        this.jdbc = jdbc;
        this.policy = policy;
    }

    public record Link(long id, String title, String url) {}

    /**
     * @param prev 더 오래된 글 (velog의 "이전 포스트")
     * @param next 더 새 글
     * @param friendsView 친구에게만 보이는 글이 섞일 수 있는 답이면 true (저장하지 않는다)
     */
    public record Adjacent(Link prev, Link next, @JsonIgnore boolean friendsView) {}

    /** 글을 읽을 수 없으면 비어 있다 (호출한 쪽이 404, docs/06 R-1). */
    public Optional<Adjacent> find(long postId, Viewer viewer) {
        Optional<ReadablePost> post = jdbc.query("""
                SELECT p.author_id, p.status, p.visibility, p.deleted_at IS NOT NULL AS deleted,
                       p.hidden_at IS NOT NULL AS hidden, m.withdrawn_at IS NOT NULL AS withdrawn
                FROM post p JOIN member m ON m.id = p.author_id WHERE p.id = ?
                """, (rs, i) -> new ReadablePost(rs.getLong("author_id"), PostStatus.valueOf(rs.getString("status")),
                Visibility.valueOf(rs.getString("visibility")), rs.getBoolean("deleted"), rs.getBoolean("hidden"),
                rs.getBoolean("withdrawn")), postId).stream().findFirst();
        if (post.isEmpty() || !policy.canRead(post.get(), viewer)) return Optional.empty();
        long authorId = post.get().authorId();
        boolean friend = viewer.memberId() != null && FriendsVisibilityRule.areFriends(jdbc, authorId, viewer.memberId());
        String condition = friend ? FeedQuery.FRIENDS_BLOG_CONDITION : PostAccessPolicy.PUBLIC_LIST_CONDITION;
        String sort = friend ? "p.published_at" : "p.first_public_at";
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
        return Optional.of(new Adjacent(links[0], links[1], friend));
    }
}
