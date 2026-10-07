package com.team.blog.post.infra;

import org.springframework.data.jpa.repository.JpaRepository;

import com.team.blog.post.domain.PostDraft;

public interface PostDraftRepository extends JpaRepository<PostDraft, Long> {
}
