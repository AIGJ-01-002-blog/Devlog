package com.team.blog.post.application;

import java.time.Instant;

import org.springframework.stereotype.Service;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.domain.Post;
import com.team.blog.post.domain.PostStatus;
import com.team.blog.post.infra.PostRepository;
import com.team.blog.shared.error.NotFoundException;

/** 에디터 열기 (docs/04 §2-5 "다시 열기"). 작성자 본인만, 남의 글은 404. */
@Service
public class PostEditorQuery {
    private final PostRepository posts;
    private final EditorStateLoader editorState;

    public PostEditorQuery(PostRepository posts, EditorStateLoader editorState) {
        this.posts = posts;
        this.editorState = editorState;
    }

    /**
     * @param editing 발행한 글을 고치는 중(작업본 또는 반영 전 자동 저장이 있음) → 내 글 관리의 "수정 중"
     * @param url     발행한 글의 주소. 임시글이면 null
     */
    public record EditorView(long id, PostStatus status, Visibility visibility, String title, String contentMd,
                             long version, Instant savedAt, boolean editing, String url,
                             Instant publishedAt, Instant firstPublicAt, Instant editedAt) {}

    public EditorView open(long memberId, String handle, long postId) {
        Post p = posts.findOwn(postId, memberId).orElseThrow(NotFoundException::new);
        EditorState s = editorState.load(p);
        boolean editing = p.isPublished() && s.source() != EditorState.Source.POST;
        return new EditorView(p.getId(), p.getStatus(), p.getVisibility(), s.title(), s.contentMd(), s.version(),
                s.savedAt(), editing, p.isPublished() ? "/@" + handle + "/posts/" + p.getId() : null,
                p.getPublishedAt(), p.getFirstPublicAt(), p.getEditedAt());
    }
}
