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

import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.cursor.CursorCodec;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.markdown.ImageUrls;
import com.team.blog.shared.time.Times;

/**
 * 홈(전체 글)과 개인 블로그 목록 (docs/10 §4·§5·§7). 목록당 쿼리 1번(글 + 작성자 + 프로필 사진),
 * 본문은 읽지 않는다. 정렬은 first_public_at 최신순, 같으면 id 큰 순. 9개씩, 10개를 읽어 다음 페이지 여부를 판단한다.
 * 작성자 본인이 봐도 블로그에는 공개 글만 나온다 (spec 003 FR-021).
 */
@Service
public class FeedQuery {
    private static final String CARD_SELECT = """
            SELECT p.id, p.title, p.excerpt, p.thumbnail_url, p.first_public_at, p.comment_count, p.like_count,
                   m.id AS author_id, m.handle, m.nickname,
                   COALESCE(pi.thumb_storage_key, pi.storage_key) AS profile_image_key
            FROM post p
            JOIN member m ON m.id = p.author_id
            LEFT JOIN image pi ON pi.uploader_id = m.id AND pi.purpose = 'PROFILE'
                              AND pi.status = 'ATTACHED' AND pi.detached_at IS NULL
            WHERE """ + " " + PostAccessPolicy.PUBLIC_LIST_CONDITION;

    private final JdbcTemplate jdbc;
    private final CursorCodec cursors;
    private final ImageUrls imageUrls;
    private final int pageSize;

    public FeedQuery(JdbcTemplate jdbc, CursorCodec cursors, ImageUrls imageUrls, BlogProperties props) {
        this.jdbc = jdbc;
        this.cursors = cursors;
        this.imageUrls = imageUrls;
        this.pageSize = props.feed().pageSize();
    }

    public record Author(long id, String handle, String nickname, String profileImageUrl) {}

    public record Card(long id, String url, String title, String excerpt, String thumbnailUrl, Instant firstPublicAt,
                       int commentCount, int likeCount, Author author) {}

    public record Page(List<Card> items, String nextCursor) {}

    public record BlogProfile(long id, String handle, String nickname, String bio, String profileImageUrl,
                              long publicPostCount, boolean mine) {}

    public Page home(String cursor) {
        return list("home", null, cursor);
    }

    public Page blog(String handle, String cursor) {
        long authorId = findBlogOwner(handle).orElseThrow(NotFoundException::new);
        return list("blog:" + authorId, authorId, cursor);
    }

    public Optional<BlogProfile> profile(String handle, Long viewerId) {
        List<BlogProfile> rows = jdbc.query("""
                SELECT m.id, m.handle, m.nickname, m.bio,
                       COALESCE(pi.thumb_storage_key, pi.storage_key) AS profile_image_key,
                       (SELECT count(*) FROM post p WHERE p.author_id = m.id AND """ + " " + PostAccessPolicy.PUBLIC_LIST_CONDITION + """
                       ) AS post_count
                FROM member m
                LEFT JOIN image pi ON pi.uploader_id = m.id AND pi.purpose = 'PROFILE'
                                  AND pi.status = 'ATTACHED' AND pi.detached_at IS NULL
                WHERE m.handle = ? AND m.withdrawn_at IS NULL AND m.deleted_at IS NULL
                """, (rs, i) -> new BlogProfile(rs.getLong("id"), rs.getString("handle"), rs.getString("nickname"),
                rs.getString("bio"), imageUrls.urlOf(rs.getString("profile_image_key")), rs.getLong("post_count"),
                viewerId != null && viewerId == rs.getLong("id")), handle);
        return rows.stream().findFirst();
    }

    private Optional<Long> findBlogOwner(String handle) {
        return jdbc.queryForList("SELECT id FROM member WHERE handle = ? AND withdrawn_at IS NULL AND deleted_at IS NULL",
                Long.class, handle).stream().findFirst();
    }

    private Page list(String listName, Long authorId, String cursor) {
        StringBuilder sql = new StringBuilder(CARD_SELECT);
        List<Object> args = new ArrayList<>();
        if (authorId != null) {
            sql.append(" AND p.author_id = ?");
            args.add(authorId);
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
        return new Card(id, "/@" + handle + "/posts/" + id, rs.getString("title"), rs.getString("excerpt"),
                rs.getString("thumbnail_url"), rs.getTimestamp("first_public_at").toInstant(),
                rs.getInt("comment_count"), rs.getInt("like_count"),
                new Author(rs.getLong("author_id"), handle, rs.getString("nickname"),
                        imageUrls.urlOf(rs.getString("profile_image_key"))));
    }
}
