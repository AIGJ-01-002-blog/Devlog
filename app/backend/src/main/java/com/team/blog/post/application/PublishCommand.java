package com.team.blog.post.application;

import java.util.List;

import com.team.blog.account.domain.Visibility;

/** 발행 요청을 정리한 값. tags는 010에서 쓴다. */
public record PublishCommand(long postId, long memberId, String title, String contentMd, Visibility visibility,
                             List<String> tags, long baseVersion) {}
