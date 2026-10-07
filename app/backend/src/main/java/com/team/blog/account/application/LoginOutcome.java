package com.team.blog.account.application;

import java.time.Instant;

import com.team.blog.shared.security.MemberPrincipal;

/** 로그인 결과 (소셜 인증 직후, 이메일 로그인). */
public sealed interface LoginOutcome {
    record LoggedIn(MemberPrincipal principal) implements LoginOutcome {}

    record NeedsSignup(PendingSignup pending) implements LoginOutcome {}

    /** 정지된 계정 (docs/07 §6). endsAt이 null이면 영구 정지. */
    record Suspended(Instant endsAt, String reason) implements LoginOutcome {}
}
