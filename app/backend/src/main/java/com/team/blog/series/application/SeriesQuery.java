package com.team.blog.series.application;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.account.domain.Visibility;
import com.team.blog.discovery.application.FeedQuery;
import com.team.blog.friend.application.FriendsVisibilityRule;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.access.ReadablePost;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.domain.PostStatus;
import com.team.blog.post.infra.PostSql;
import com.team.blog.shared.jdbc.Columns;
import com.team.blog.shared.markdown.ImageUrls;

/**
 * 시리즈 읽기 (024 US2). 보이는 글은 블로그 목록과 같은 조건이다 (FR-004): 남은 공개 글, 친구는 친구 공개 글까지,
 * 주인은 비공개·숨김 글까지(임시글은 빼고). 개수·순서·대표 사진 모두 보는 사람이 읽을 수 있는 글로만 센다.
 */
@Service
public class SeriesQuery {
    /** 주인에게 보이는 글: 발행했고 휴지통에 없는 글 */
    static final String OWNER_CONDITION = "p.status = 'PUBLISHED' AND p.deleted_at IS NULL";

    private final JdbcTemplate jdbc;
    private final FeedQuery feed;
    private final PostAccessPolicy policy;
    private final ImageUrls imageUrls;

    public SeriesQuery(JdbcTemplate jdbc, FeedQuery feed, PostAccessPolicy policy, ImageUrls imageUrls) {
        this.jdbc = jdbc;
        this.feed = feed;
        this.policy = policy;
        this.imageUrls = imageUrls;
    }

    public record Summary(long id, String name, String slug, int postCount, String thumbnailUrl, Instant updatedAt) {}

    /** @param personal 친구·주인이라 남과 다른 응답 */
    public record Listing(List<Summary> items, boolean personal) {}

    /** @param personal 친구·주인이라 남과 다른 응답. 어디에도 저장하지 않는다 (docs/06 R-5) */
    public record Detail(long id, String name, String slug, Instant updatedAt, boolean mine, List<FeedQuery.Card> posts,
                         @com.fasterxml.jackson.annotation.JsonIgnore boolean personal) {}

    public record Item(long id, String title, String url) {}

    /**
     * 글 상세의 시리즈 상자. index는 1부터이고, 지금 글이 목록에 없으면(주인이 보는 임시글) null이다.
     * @param publiclyVisible 공개 글만 담겨 브라우저에 잠시 둬도 되는 응답인지
     */
    public record Navigation(long id, String name, String slug, String handle, Integer index, List<Item> posts,
                             @com.fasterxml.jackson.annotation.JsonIgnore boolean publiclyVisible) {}

    private record Scope(long ownerId, boolean mine, boolean friend) {
        String condition() {
            return mine ? OWNER_CONDITION : friend ? FeedQuery.FRIENDS_BLOG_CONDITION : PostAccessPolicy.PUBLIC_LIST_CONDITION;
        }
    }

    /** 블로그의 시리즈 탭. 최근 수정 순. 남에게는 읽을 수 있는 글이 없는 시리즈를 숨긴다 (US2-3). */
    public Optional<Listing> list(String handle, Long viewerId) {
        return scope(handle, viewerId).map(s -> new Listing(jdbc.query("""
                SELECT s.id, s.name, s.slug, s.updated_at, v.cnt, f.thumbnail_key
                FROM series s
                CROSS JOIN LATERAL (SELECT count(*) AS cnt FROM series_post sp
                                    JOIN post p ON p.id = sp.post_id JOIN member m ON m.id = p.author_id
                                    WHERE sp.series_id = s.id AND """ + " " + s.condition() + " " + """
                                    ) v
                LEFT JOIN LATERAL (SELECT """ + " " + PostSql.THUMBNAIL_KEY + " " + """
                                   FROM series_post sp JOIN post p ON p.id = sp.post_id JOIN member m ON m.id = p.author_id
                                   WHERE sp.series_id = s.id AND """ + " " + s.condition() + " " + """
                                   ORDER BY sp.position LIMIT 1) f ON TRUE
                WHERE s.member_id = ? AND (? OR v.cnt > 0)
                ORDER BY s.updated_at DESC, s.id DESC
                """, (rs, i) -> new Summary(rs.getLong("id"), rs.getString("name"), rs.getString("slug"), rs.getInt("cnt"),
                imageUrls.urlOf(rs.getString("thumbnail_key")), rs.getTimestamp("updated_at").toInstant()),
                s.ownerId(), s.mine()), s.mine() || s.friend()));
    }

    /** 시리즈 페이지. 남에게는 읽을 수 있는 글이 없으면 없는 시리즈다. */
    public Optional<Detail> detail(String handle, String slug, Long viewerId) {
        return scope(handle, viewerId).flatMap(s -> jdbc.query(
                "SELECT id, name, slug, updated_at FROM series WHERE member_id = ? AND slug = ?",
                (rs, i) -> new Object[] {rs.getLong(1), rs.getString(2), rs.getString(3), rs.getTimestamp(4)},
                s.ownerId(), slug).stream().findFirst().flatMap(row -> {
                    long id = (Long) row[0];
                    List<Long> ids = Columns.longs(jdbc, "SELECT post_id FROM series_post WHERE series_id = ? ORDER BY position", id);
                    List<FeedQuery.Card> posts = feed.cards(ids, s.condition());
                    if (posts.isEmpty() && !s.mine()) return Optional.empty();
                    return Optional.of(new Detail(id, (String) row[1], (String) row[2], ((Timestamp) row[3]).toInstant(), s.mine(),
                            posts, s.mine() || s.friend()));
                }));
    }

    /**
     * 글 상세의 시리즈 상자 (US2-1). 글을 읽을 수 없거나 시리즈에 없으면 비어 있다.
     * 작성자는 임시글에서도 자기 시리즈 정보를 본다(글쓰기 화면이 지금 시리즈를 이걸로 안다).
     */
    public Optional<Navigation> forPost(long postId, Viewer viewer) {
        record Row(ReadablePost post, long seriesId, String name, String slug, String handle) {}
        Optional<Row> found = jdbc.query("""
                SELECT p.author_id, p.status, p.visibility, p.deleted_at IS NOT NULL AS deleted, p.hidden_at IS NOT NULL AS hidden,
                       m.withdrawn_at IS NOT NULL AS withdrawn, s.id AS series_id, s.name, s.slug, m.handle
                FROM series_post sp JOIN series s ON s.id = sp.series_id
                JOIN post p ON p.id = sp.post_id JOIN member m ON m.id = p.author_id
                WHERE sp.post_id = ?
                """, (rs, i) -> new Row(new ReadablePost(rs.getLong("author_id"), PostStatus.valueOf(rs.getString("status")),
                Visibility.valueOf(rs.getString("visibility")), rs.getBoolean("deleted"), rs.getBoolean("hidden"),
                rs.getBoolean("withdrawn")), rs.getLong("series_id"), rs.getString("name"), rs.getString("slug"),
                rs.getString("handle")), postId).stream().findFirst();
        if (found.isEmpty() || !policy.canRead(found.get().post(), viewer)) return Optional.empty();
        Row r = found.get();
        long ownerId = r.post().authorId();
        boolean mine = viewer.is(ownerId);
        boolean friend = !mine && viewer.memberId() != null && FriendsVisibilityRule.areFriends(jdbc, ownerId, viewer.memberId());
        Scope scope = new Scope(ownerId, mine, friend);
        List<Item> items = jdbc.query("""
                SELECT p.id, p.title FROM series_post sp JOIN post p ON p.id = sp.post_id JOIN member m ON m.id = p.author_id
                WHERE sp.series_id = ? AND """ + " " + scope.condition() + " " + """
                 ORDER BY sp.position
                """, (rs, i) -> new Item(rs.getLong(1), rs.getString(2), "/@" + r.handle() + "/posts/" + rs.getLong(1)), r.seriesId());
        Integer index = null;
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).id() == postId) index = i + 1;
        }
        return Optional.of(new Navigation(r.seriesId(), r.name(), r.slug(), r.handle(), index, items, !mine && !friend));
    }

    private Optional<Scope> scope(String handle, Long viewerId) {
        return feed.ownerId(handle).map(ownerId -> {
            boolean mine = ownerId.equals(viewerId); // 둘 다 Long이라 == 는 참조 비교
            boolean friend = !mine && viewerId != null && FriendsVisibilityRule.areFriends(jdbc, ownerId, viewerId);
            return new Scope(ownerId, mine, friend);
        });
    }
}
