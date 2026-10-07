package com.team.blog.post.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 발행한 글을 고치는 동안의 작업본. 독자는 다시 발행할 때까지 post의 발행본을 본다 (docs/04 §2-4, docs/05 §2). */
@Entity
@Table(name = "post_draft")
public class PostDraft {
    @Id
    private Long postId;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false)
    private String contentMd;

    @Column(nullable = false)
    private long editVersion;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected PostDraft() {}

    public static PostDraft of(long postId, String title, String contentMd, long version, Instant now) {
        PostDraft d = new PostDraft();
        d.postId = postId;
        d.title = title;
        d.contentMd = contentMd;
        d.editVersion = version;
        d.createdAt = now;
        d.updatedAt = now;
        return d;
    }

    public void update(String title, String contentMd, long version, Instant now) {
        this.title = title;
        this.contentMd = contentMd;
        this.editVersion = version;
        this.updatedAt = now;
    }

    public Long getPostId() { return postId; }
    public String getTitle() { return title; }
    public String getContentMd() { return contentMd; }
    public long getEditVersion() { return editVersion; }
    public Instant getUpdatedAt() { return updatedAt; }
}
