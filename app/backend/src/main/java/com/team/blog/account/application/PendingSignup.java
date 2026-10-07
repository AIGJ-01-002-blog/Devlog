package com.team.blog.account.application;

import java.io.Serial;
import java.io.Serializable;
import java.time.Duration;
import java.time.Instant;

/** 가입 마무리 전의 소셜 인증 정보. 세션에 10분만 보관한다 (docs/07 §5). 이 동안 계정은 없다. */
public record PendingSignup(SocialProfile profile, Instant createdAt) implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    public static final String SESSION_KEY = "blog.pendingSignup";

    public boolean isExpired(Instant now, Duration ttl) {
        return createdAt.plus(ttl).isBefore(now);
    }
}
