package com.team.blog.moderation.application;

import java.time.Instant;

/** 신고·숨김·정지 사건 (019 FR-039~FR-042, docs/20 §3-5). 커밋 뒤에 받는다. 신고자 정보와 정지 사유 글자는 넣지 않는다. */
public final class ModerationEvents {
    private ModerationEvents() {}

    /** 사건 하나를 처리함. hidden이면 "조치함", 아니면 "문제없음". 받는 쪽이 그 사건의 신고마다 알린다. */
    public record ReportsResolved(long caseId, boolean hidden, Instant at) {}

    /** 글·댓글을 숨김. postId는 댓글이면 그 댓글의 글 */
    public record ContentHidden(long caseId, ReportTarget targetType, long targetId, long ownerId, long postId, Instant at) {}

    /** 숨김 해제. 작성자에게 알리지 않는다(FR-027) */
    public record ContentUnhidden(ReportTarget targetType, long targetId, long ownerId, Instant at) {}

    /** 회원 정지. endsAt이 null이면 영구 */
    public record MemberSuspended(long memberId, Instant endsAt, Instant at) {}
}
