package com.team.blog.post.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.team.blog.account.domain.Visibility;
import com.team.blog.shared.markdown.RenderedContent;

/**
 * 글. 발행·공개 범위의 시각 규칙(published_at, first_public_at, edited_at)을 이 엔티티의 메서드에 모은다 (docs/05 J-1).
 * edit_version은 Redis 자동 저장·스케줄러와 함께 쓰므로 @Version을 붙이지 않는다 (J-3).
 * 조회수·좋아요·댓글 수는 엔티티로 바꾸지 않고 전용 UPDATE 쿼리로만 바꾼다 (J-2) — 그래서 여기서는 읽기 전용이다.
 */
@Entity
@Table(name = "post")
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private long authorId;

    @Column(nullable = false, length = 100)
    private String title = "";

    @Column(nullable = false)
    private String contentMd = "";

    @Column(nullable = false)
    private String contentHtml = "";

    @Column(length = 200)
    private String excerpt;

    @Column(length = 500)
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus status = PostStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility visibility = Visibility.PUBLIC;

    @Column(nullable = false, insertable = false, updatable = false)
    private long viewCount;
    @Column(nullable = false, insertable = false, updatable = false)
    private int likeCount;
    @Column(nullable = false, insertable = false, updatable = false)
    private int commentCount;

    @Column(nullable = false)
    private long editVersion;

    @Column(nullable = false)
    private int renderVersion = 1;

    private Instant publishedAt;
    private Instant firstPublicAt;
    private Instant editedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    private Instant deletedAt;
    private Instant hiddenAt;
    private Long hiddenBy;
    @Column(length = 30)
    private String hiddenReason;

    protected Post() {}

    public static Post newDraft(long authorId, Visibility visibility, String title, String contentMd, Instant now) {
        Post p = new Post();
        p.authorId = authorId;
        p.visibility = visibility;
        p.title = title;
        p.contentMd = contentMd;
        p.createdAt = now;
        p.updatedAt = now;
        return p;
    }

    /** 임시글 내용 저장 (수동 저장, Redis 장애 시 자동 저장). */
    public void saveDraftContent(String title, String contentMd, long version, Instant now) {
        if (status != PostStatus.DRAFT) throw new IllegalStateException("발행한 글의 수정 내용은 작업본(post_draft)에 저장한다");
        this.title = title;
        this.contentMd = contentMd;
        this.editVersion = version;
        this.updatedAt = now;
    }

    /**
     * 최초 발행과 다시 발행 (docs/05 §7 ⑦, §8).
     * @return 최초 발행이면 true
     */
    public boolean publish(String title, String contentMd, RenderedContent rendered, String thumbnailUrl,
                           Visibility visibility, long version, Instant now) {
        boolean first = status == PostStatus.DRAFT;
        this.title = title;
        this.contentMd = contentMd;
        this.contentHtml = rendered.html();
        this.excerpt = rendered.excerpt();
        this.renderVersion = rendered.renderVersion();
        this.thumbnailUrl = thumbnailUrl;
        this.status = PostStatus.PUBLISHED;
        if (publishedAt == null) publishedAt = now;
        if (!first) editedAt = now;
        this.editVersion = version;
        this.updatedAt = now;
        changeVisibilityInternal(visibility, now);
        return first;
    }

    /** 공개 범위만 바꾼다. 다시 발행이 아니므로 edited_at·작업본은 그대로다 (docs/06 §4). */
    public void changeVisibility(Visibility visibility, Instant now) {
        if (this.visibility == visibility) return;
        changeVisibilityInternal(visibility, now);
        this.updatedAt = now;
    }

    private void changeVisibilityInternal(Visibility visibility, Instant now) {
        this.visibility = visibility;
        // 처음으로 "발행 + 전체 공개"가 된 순간을 한 번만 기록한다. 껐다 켜도 목록 위치가 바뀌지 않는다 (docs/05 §3)
        if (status == PostStatus.PUBLISHED && visibility == Visibility.PUBLIC && firstPublicAt == null) {
            firstPublicAt = now;
        }
    }

    /** 변경 취소 등으로 작업 버전만 올린다. 오래된 탭의 저장을 충돌로 막기 위해서다. */
    public void bumpVersion(long version, Instant now) {
        this.editVersion = version;
        this.updatedAt = now;
    }

    public boolean isPublished() { return status == PostStatus.PUBLISHED; }
    public boolean isDeleted() { return deletedAt != null; }
    public boolean isHidden() { return hiddenAt != null; }

    public Long getId() { return id; }
    public long getAuthorId() { return authorId; }
    public String getTitle() { return title; }
    public String getContentMd() { return contentMd; }
    public String getContentHtml() { return contentHtml; }
    public String getExcerpt() { return excerpt; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public PostStatus getStatus() { return status; }
    public Visibility getVisibility() { return visibility; }
    public long getViewCount() { return viewCount; }
    public int getLikeCount() { return likeCount; }
    public int getCommentCount() { return commentCount; }
    public long getEditVersion() { return editVersion; }
    public int getRenderVersion() { return renderVersion; }
    public Instant getPublishedAt() { return publishedAt; }
    public Instant getFirstPublicAt() { return firstPublicAt; }
    public Instant getEditedAt() { return editedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public Instant getHiddenAt() { return hiddenAt; }
    public String getHiddenReason() { return hiddenReason; }
}
