package com.team.blog.post.access;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.team.blog.account.domain.Visibility;

/** 공통 공개 범위: PUBLIC은 누구나, PRIVATE는 작성자만(작성자 판정은 정책이 이미 했으므로 여기서는 항상 거부). */
@Configuration
public class BuiltInVisibilityRules {
    @Bean
    VisibilityRule publicRule() {
        return new VisibilityRule() {
            public Visibility visibility() { return Visibility.PUBLIC; }
            public boolean canRead(ReadablePost post, Viewer viewer) { return true; }
        };
    }

    @Bean
    VisibilityRule privateRule() {
        return new VisibilityRule() {
            public Visibility visibility() { return Visibility.PRIVATE; }
            public boolean canRead(ReadablePost post, Viewer viewer) { return false; }
        };
    }
}
