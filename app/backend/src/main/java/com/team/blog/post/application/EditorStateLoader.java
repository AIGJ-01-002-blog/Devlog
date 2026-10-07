package com.team.blog.post.application;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.team.blog.post.domain.Post;
import com.team.blog.post.domain.PostDraft;
import com.team.blog.post.infra.AutosaveStore;
import com.team.blog.post.infra.PostDraftRepository;

/** 세 저장 위치 중 가장 새 내용을 고른다. Redis가 멈춰 있으면 DB만 본다. */
@Component
public class EditorStateLoader {
    private static final Logger log = LoggerFactory.getLogger(EditorStateLoader.class);

    private final AutosaveStore autosave;
    private final PostDraftRepository drafts;

    public EditorStateLoader(AutosaveStore autosave, PostDraftRepository drafts) {
        this.autosave = autosave;
        this.drafts = drafts;
    }

    public Optional<PostDraft> workingCopy(Post post) {
        return post.isPublished() ? drafts.findById(post.getId()) : Optional.empty();
    }

    public long dbVersion(Post post, Optional<PostDraft> draft) {
        return Math.max(post.getEditVersion(), draft.map(PostDraft::getEditVersion).orElse(0L));
    }

    public EditorState load(Post post) {
        Optional<PostDraft> draft = workingCopy(post);
        long dbVersion = dbVersion(post, draft);
        Optional<AutosaveStore.Snapshot> snap = readAutosave(post.getId())
                .filter(s -> s.memberId() == post.getAuthorId() && s.version() > dbVersion);
        if (snap.isPresent()) {
            AutosaveStore.Snapshot s = snap.get();
            return new EditorState(s.title(), s.contentMd(), s.version(), s.savedAt(), EditorState.Source.AUTOSAVE);
        }
        if (draft.isPresent() && draft.get().getEditVersion() >= post.getEditVersion()) {
            PostDraft d = draft.get();
            return new EditorState(d.getTitle(), d.getContentMd(), d.getEditVersion(), d.getUpdatedAt(), EditorState.Source.WORKING_COPY);
        }
        return new EditorState(post.getTitle(), post.getContentMd(), post.getEditVersion(), post.getUpdatedAt(), EditorState.Source.POST);
    }

    /** 발행 글에 "수정 중" 표시가 필요한지: 작업본이 있거나 아직 반영 전인 자동 저장이 있음. */
    public boolean isEditing(Post post) {
        if (!post.isPublished()) return false;
        return load(post).source() != EditorState.Source.POST;
    }

    private Optional<AutosaveStore.Snapshot> readAutosave(long postId) {
        try {
            return autosave.read(postId);
        } catch (RuntimeException e) {
            log.warn("자동 저장 내용을 읽지 못해 DB 내용만 봅니다: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
