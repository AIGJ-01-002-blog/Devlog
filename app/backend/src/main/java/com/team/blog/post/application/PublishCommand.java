package com.team.blog.post.application;

import java.util.List;

import com.team.blog.account.domain.Visibility;

/** 발행 요청을 정리한 값. tags는 010, summary(null = 자동 요약)는 045에서 쓴다. */
public record PublishCommand(long postId, long memberId, String title, String contentMd, String summary,
                             Visibility visibility, List<String> tags, long baseVersion) {}
