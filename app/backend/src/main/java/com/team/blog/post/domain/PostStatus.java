package com.team.blog.post.domain;

/** 글 상태는 임시글 → 발행 한 방향으로만 흐른다 (docs/05 P-1). */
public enum PostStatus { DRAFT, PUBLISHED }
