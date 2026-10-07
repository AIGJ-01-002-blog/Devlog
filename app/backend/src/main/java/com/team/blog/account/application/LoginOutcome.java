package com.team.blog.account.application;

import java.time.Instant;

import com.team.blog.shared.security.MemberPrincipal;

/** 소셜 인증 직후 결과. */
public sealed interface LoginOutcome {
    record LoggedIn(MemberPrincipal principal) implements LoginOutcome {}

    record NeedsSignup(PendingSignup pending) implements LoginOutcome {}

    /** 정지된 계정 (docs/07 §6). endsAt이 null이면 영구 정지. */
    record Suspended(Instant endsAt, String reason) implements LoginOutcome {}

    /** GitHub에 인증된 대표 이메일이 없음 (001 가정 A-3). */
    record NoVerifiedEmail() implements LoginOutcome {}
}
