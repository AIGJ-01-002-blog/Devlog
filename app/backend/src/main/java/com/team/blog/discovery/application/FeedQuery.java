package com.team.blog.discovery.application;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.friend.application.FriendQuery;
import com.team.blog.friend.application.FriendService;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.cursor.CursorCodec;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.post.infra.PostSql;
import com.team.blog.shared.markdown.ContentRenderer;
import com.team.blog.shared.markdown.ImageUrls;
import com.team.blog.shared.time.Times;

/**
 * 홈(전체 글)과 개인 블로그 목록 (docs/10 §4·§5·§7). 목록당 쿼리 1번(글 + 작성자 + 프로필 사진 + 수),
 * 본문은 앞 600자만 읽어 요약을 만든다(V3: 요약·대표 사진·수를 저장하지 않는다). 정렬은 first_public_at 최신순, 같으면 id 큰 순. 9개씩, 10개를 읽어 다음 페이지 여부를 판단한다.
 * 작성자 본인이 봐도 블로그에는 공개 글만 나온다 (spec 003 FR-021).
 */
@Service
public class FeedQuery {
    private static final String CARD_SELECT =
            "SELECT p.id, p.title, p.first_public_at, s.comment_count, s.like_count, m.id AS author_id, m.handle, m.nickname, "
            + PostSql.CONTENT_HEAD + ", " + PostSql.THUMBNAIL_KEY + ", " + PostSql.PROFILE_IMAGE_KEY
            + " FROM post p JOIN member m ON m.id = p.author_id " + PostSql.STAT_JOIN + " " + PostSql.PROFILE_IMAGE_JOIN
            + " WHERE " + PostAccessPolicy.PUBLIC_LIST_CONDITION;

    private final JdbcTemplate jdbc;
    private final CursorCodec cursors;
    private final ImageUrls imageUrls;
    private final ContentRenderer renderer;
    private final int pageSize;
    private final FriendService friends;
    private final FriendQuery friendQuery;

    public FeedQuery(JdbcTemplate jdbc, CursorCodec cursors, ImageUrls imageUrls, ContentRenderer renderer,
                     BlogProperties props, FriendService friends, FriendQuery friendQuery) {
        this.jdbc = jdbc;
        this.friends = friends;
        this.friendQuery = friendQuery;
        this.cursors = cursors;
        this.imageUrls = imageUrls;
        this.renderer = renderer;
        this.pageSize = props.feed().pageSize();
    }

    public record Author(long id, String handle, String nickname, String profileImageUrl) {}

    public record Card(long id, String url, String title, String excerpt, String thumbnailUrl, Instant firstPublicAt,
                       int commentCount, int likeCount, Author author) {}

    public record Page(List<Card> items, String nextCursor) {}

    /**
     * @param friendship        보는 사람 기준 친구 관계 (NONE·SENT·RECEIVED·FRIENDS). 비회원·본인이면 null
     * @param lastActiveDaysAgo 친구이고 양쪽 모두 공개 설정을 켰을 때만 0~7 (008 FR-009·FR-010)
     */
    public record BlogProfile(long id, String handle, String nickname, String bio, String profileImageUrl,
                              long publicPostCount, boolean mine, String friendship, Integer lastActiveDaysAgo) {
        BlogProfile withFriendship(String relation, Integer days) {
            return new BlogProfile(id, handle, nickname, bio, profileImageUrl, publicPostCount, mine, relation, days);
        }
    }

    public Page home(String cursor) {
        return list("home", null, null, cursor);
    }

    public Page blog(String handle, String cursor) {
        return blog(handle, null, cursor);
    }

    /** @param tag 정규화한 태그 이름. null이면 거르지 않는다 (010 블로그 안 태그 필터) */
    public Page blog(String handle, String tag, String cursor) {
        long authorId = findBlogOwner(handle).orElseThrow(NotFoundException::new);
        return list(tag == null ? "blog:" + authorId : "blog:" + authorId + ":tag:" + tag, authorId, tag, cursor);
    }

    /** 태그별 목록 (010 FR-019). 없는 태그도 빈 목록이라 비공개 글에만 쓰인 태그와 구별되지 않는다. */
    public Page tag(String tag, String cursor) {
        return list("tag:" + tag, null, tag, cursor);
    }

    public Optional<BlogProfile> profile(String handle, Long viewerId) {
        List<BlogProfile> rows = jdbc.query("""
                SELECT m.id, m.handle, m.nickname, m.bio, """ + PostSql.PROFILE_IMAGE_KEY + """
                       , (SELECT count(*) FROM post p WHERE p.author_id = m.id AND """ + " " + PostAccessPolicy.PUBLIC_LIST_CONDITION + """
                       ) AS post_count
                FROM member m
                """ + PostSql.PROFILE_IMAGE_JOIN + """

                WHERE m.handle = ? AND m.withdrawn_at IS NULL AND m.deleted_at IS NULL
                """, (rs, i) -> new BlogProfile(rs.getLong("id"), rs.getString("handle"), rs.getString("nickname"),
                rs.getString("bio"), imageUrls.urlOf(rs.getString("profile_image_key")), rs.getLong("post_count"),
                viewerId != null && viewerId == rs.getLong("id"), null, null), handle);
        return rows.stream().findFirst().map(p -> viewerId == null || p.mine() ? p
                : p.withFriendship(friends.relation(viewerId, p.id()).name(), friendQuery.lastActiveDaysAgo(viewerId, p.id()).orElse(null)));
    }

    public Optional<Long> ownerId(String handle) {
        return findBlogOwner(handle);
    }

    private Optional<Long> findBlogOwner(String handle) {
        return jdbc.queryForList("SELECT id FROM member WHERE handle = ? AND withdrawn_at IS NULL AND deleted_at IS NULL",
                Long.class, handle).stream().findFirst();
    }

    private Page list(String listName, Long authorId, String tag, String cursor) {
        StringBuilder sql = new StringBuilder(CARD_SELECT);
        List<Object> args = new ArrayList<>();
        if (authorId != null) {
            sql.append(" AND p.author_id = ?");
            args.add(authorId);
        }
        if (tag != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM post_tag pt JOIN tag t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.name = ?)");
            args.add(tag);
        }
        if (cursor != null && !cursor.isBlank()) {
            long[] k = cursors.decode(cursor, listName, 2);
            sql.append(" AND (p.first_public_at, p.id) < (?, ?)");
            args.add(Timestamp.from(Times.fromEpochMicros(k[0])));
            args.add(k[1]);
        }
        sql.append(" ORDER BY p.first_public_at DESC, p.id DESC LIMIT ").append(pageSize + 1);
        List<Card> cards = jdbc.query(sql.toString(), this::card, args.toArray());
        CursorCodec.Page<Card> page = CursorCodec.page(cards, pageSize,
                c -> cursors.encode(listName, Times.toEpochMicros(c.firstPublicAt()), c.id()));
        return new Page(page.items(), page.nextCursor());
    }

    private Card card(ResultSet rs, int i) throws SQLException {
        String handle = rs.getString("handle");
        long id = rs.getLong("id");
        return new Card(id, "/@" + handle + "/posts/" + id, rs.getString("title"),
                renderer.excerpt(rs.getString("content_head")), imageUrls.urlOf(rs.getString("thumbnail_key")),
                rs.getTimestamp("first_public_at").toInstant(),
                rs.getInt("comment_count"), rs.getInt("like_count"),
                new Author(rs.getLong("author_id"), handle, rs.getString("nickname"),
                        imageUrls.urlOf(rs.getString("profile_image_key"))));
    }
}
