package com.team.blog.account.application;

import java.time.Instant;

/** 회원 상태 사건 (020 FR-036). 커밋 뒤에 받는다. 세션 삭제처럼 반드시 해야 하는 일은 사건에 맡기지 않는다. */
public final class MemberEvents {
    private MemberEvents() {}

    public record MemberWithdrawn(long memberId, Instant withdrawnAt) {}

    public record MemberRestored(long memberId, Instant restoredAt) {}
}
