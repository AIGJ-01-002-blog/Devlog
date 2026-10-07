package com.team.blog.discovery.application;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.access.ReadablePost;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.domain.PostStatus;
import com.team.blog.shared.markdown.ImageUrls;

/**
 * 글 상세 (docs/40). 판정은 PostAccessPolicy 한곳에서 한다. 본문 HTML은 발행 때 만든 값을 그대로 쓴다.
 * 수정 중인 글이라도 독자·작성자 모두 마지막 발행본을 본다 (작성자에게는 "수정 중" 안내 정보만 더한다).
 */
@Service
public class PostDetailQuery {
    private final JdbcTemplate jdbc;
    private final PostAccessPolicy policy;
    private final ImageUrls imageUrls;

    public PostDetailQuery(JdbcTemplate jdbc, PostAccessPolicy policy, ImageUrls imageUrls) {
        this.jdbc = jdbc;
        this.policy = policy;
        this.imageUrls = imageUrls;
    }

    public record Author(long id, String handle, String nickname, String bio, String profileImageUrl) {}

    /** 작성자에게만 채운다. 독자에게는 null. */
    public record OwnerInfo(boolean editing, Instant editingSavedAt, boolean hidden) {}

    public record Detail(long id, String url, String title, String contentHtml, String excerpt, String thumbnailUrl,
                         PostStatus status, Visibility visibility, Instant publishedAt, Instant firstPublicAt,
                         Instant editedAt, long viewCount, int likeCount, int commentCount, Author author,
                         boolean mine, OwnerInfo owner) {
        /** 독자에게 보이는 날짜: 공개 글은 처음 공개된 날, 비공개 글은 최초 발행일 (spec 003 FR-005). */
        public Instant displayDate() {
            return firstPublicAt != null ? firstPublicAt : publishedAt;
        }

        public boolean publiclyVisible() {
            return status == PostStatus.PUBLISHED && visibility == Visibility.PUBLIC && (owner == null || !owner.hidden());
        }
    }

    public Optional<Detail> find(long postId, Viewer viewer) {
        List<Row> rows = jdbc.query("""
                SELECT p.id, p.author_id, p.title, p.content_html, p.excerpt, p.thumbnail_url, p.status, p.visibility,
                       p.published_at, p.first_public_at, p.edited_at, p.view_count, p.like_count, p.comment_count,
                       p.deleted_at IS NOT NULL AS deleted, p.hidden_at IS NOT NULL AS hidden,
                       m.handle, m.nickname, m.bio, m.withdrawn_at IS NOT NULL AS withdrawn,
                       COALESCE(pi.thumb_storage_key, pi.storage_key) AS profile_image_key,
                       d.updated_at AS draft_saved_at
                FROM post p
                JOIN member m ON m.id = p.author_id
                LEFT JOIN image pi ON pi.uploader_id = m.id AND pi.purpose = 'PROFILE'
                                  AND pi.status = 'ATTACHED' AND pi.detached_at IS NULL
                LEFT JOIN post_draft d ON d.post_id = p.id
                WHERE p.id = ?
                """, (rs, i) -> new Row(rs.getLong("id"), rs.getLong("author_id"), rs.getString("title"),
                rs.getString("content_html"), rs.getString("excerpt"), rs.getString("thumbnail_url"),
                PostStatus.valueOf(rs.getString("status")), Visibility.valueOf(rs.getString("visibility")),
                instant(rs.getTimestamp("published_at")), instant(rs.getTimestamp("first_public_at")),
                instant(rs.getTimestamp("edited_at")), rs.getLong("view_count"), rs.getInt("like_count"),
                rs.getInt("comment_count"), rs.getBoolean("deleted"), rs.getBoolean("hidden"), rs.getString("handle"),
                rs.getString("nickname"), rs.getString("bio"), rs.getBoolean("withdrawn"),
                rs.getString("profile_image_key"), instant(rs.getTimestamp("draft_saved_at"))), postId);
        if (rows.isEmpty()) return Optional.empty();
        Row r = rows.get(0);
        ReadablePost readable = new ReadablePost(r.authorId, r.status, r.visibility, r.deleted, r.hidden, r.withdrawn);
        if (!policy.canRead(readable, viewer)) return Optional.empty();
        boolean mine = viewer.is(r.authorId);
        OwnerInfo owner = mine ? new OwnerInfo(r.draftSavedAt != null, r.draftSavedAt, r.hidden) : null;
        return Optional.of(new Detail(r.id, "/@" + r.handle + "/posts/" + r.id, r.title, r.contentHtml, r.excerpt,
                r.thumbnailUrl, r.status, r.visibility, r.publishedAt, r.firstPublicAt, r.editedAt, r.viewCount,
                r.likeCount, r.commentCount,
                new Author(r.authorId, r.handle, r.nickname, r.bio, imageUrls.urlOf(r.profileImageKey)), mine, owner));
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }

    private record Row(long id, long authorId, String title, String contentHtml, String excerpt, String thumbnailUrl,
                       PostStatus status, Visibility visibility, Instant publishedAt, Instant firstPublicAt,
                       Instant editedAt, long viewCount, int likeCount, int commentCount, boolean deleted,
                       boolean hidden, String handle, String nickname, String bio, boolean withdrawn,
                       String profileImageKey, Instant draftSavedAt) {}
}
