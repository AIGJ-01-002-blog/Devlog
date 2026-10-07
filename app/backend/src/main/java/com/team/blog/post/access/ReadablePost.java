package com.team.blog.post.access;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.domain.PostStatus;

/** 읽기 판정에 필요한 값만 모은 것. 엔티티든 목록 행이든 이 형태로 넘겨 같은 규칙을 탄다. */
public record ReadablePost(long authorId, PostStatus status, Visibility visibility, boolean deleted, boolean hidden,
                           boolean authorWithdrawn) {}
