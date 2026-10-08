package com.team.blog.post.application;

import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;

import org.springframework.stereotype.Service;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.domain.Post;
import com.team.blog.post.domain.PostStatus;
import com.team.blog.post.infra.PostRepository;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.jdbc.Columns;
import com.team.blog.shared.markdown.ImageUrls;

/** 에디터 열기 (docs/04 §2-5 "다시 열기"). 작성자 본인만, 남의 글은 404. */
@Service
public class PostEditorQuery {
    private final PostRepository posts;
    private final EditorStateLoader editorState;
    private final JdbcTemplate jdbc;
    private final ImageUrls imageUrls;

    public PostEditorQuery(PostRepository posts, EditorStateLoader editorState, JdbcTemplate jdbc, ImageUrls imageUrls) {
        this.posts = posts;
        this.editorState = editorState;
        this.jdbc = jdbc;
        this.imageUrls = imageUrls;
    }

    /**
     * @param editing 발행한 글을 고치는 중(작업본 또는 반영 전 자동 저장이 있음) → 내 글 관리의 "수정 중"
     * @param url     발행한 글의 주소. 임시글이면 null
     * @param tags    지금 달린 태그(입력 순서). 다시 발행할 때 발행 설정 창을 미리 채운다 (010 FR-014)
     * @param summary 작성자가 쓴 짧은 소개(045). 없으면 null. 태그처럼 발행 설정 창을 미리 채운다
     * @param thumbnailUrl    작성자가 고른 썸네일 사진 주소(047). 고르지 않았으면 null(본문 첫 사진)
     * @param thumbnailHidden 썸네일을 없앴으면 true
     */
    public record EditorView(long id, PostStatus status, Visibility visibility, String title, String contentMd,
                             long version, Instant savedAt, boolean editing, String url,
                             Instant publishedAt, Instant firstPublicAt, Instant editedAt, List<String> tags, String summary,
                             String thumbnailUrl, boolean thumbnailHidden) {}

    private record Thumbnail(String url, boolean hidden) {}

    public EditorView open(long memberId, String handle, long postId) {
        Post p = posts.findOwn(postId, memberId).orElseThrow(NotFoundException::new);
        EditorState s = editorState.load(p);
        boolean editing = p.isPublished() && s.source() != EditorState.Source.POST;
        Thumbnail thumb = jdbc.query("""
                SELECT r.storage_key FROM post_thumbnail pt LEFT JOIN resource r ON r.id = pt.resource_id WHERE pt.post_id = ?
                """, rs -> {
                    if (!rs.next()) return new Thumbnail(null, false);
                    String key = rs.getString(1);
                    return new Thumbnail(imageUrls.urlOf(key), key == null);
                }, p.getId());
        return new EditorView(p.getId(), p.getStatus(), p.getVisibility(), s.title(), s.contentMd(), s.version(),
                s.savedAt(), editing, p.isPublished() ? "/@" + handle + "/posts/" + p.getId() : null,
                p.getPublishedAt(), p.getFirstPublicAt(), p.getEditedAt(),
                Columns.strings(jdbc, "SELECT t.name FROM post_tag pt JOIN tag t ON t.id = pt.tag_id WHERE pt.post_id = ? ORDER BY pt.position",
                        p.getId()), p.getSummary(), thumb.url(), thumb.hidden());
    }
}
