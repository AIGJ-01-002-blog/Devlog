package com.team.blog.account.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 정지 이력 (docs/07 §6, 2026-10-07 E3). 열린 정지 = lifted_at IS NULL. ends_at이 없으면 영구. */
@Entity
@Table(name = "member_suspension")
public class MemberSuspension {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long memberId;

    @Column(nullable = false, length = 200)
    private String reason;

    @Column(nullable = false)
    private Instant startedAt;

    private Instant endsAt;

    @Column(nullable = false)
    private Long suspendedBy;

    private Instant liftedAt;
    private Long liftedBy;

    protected MemberSuspension() {}

    public static MemberSuspension start(long memberId, String reason, Instant now, Instant endsAt, long adminId) {
        MemberSuspension s = new MemberSuspension();
        s.memberId = memberId;
        s.reason = reason;
        s.startedAt = now;
        s.endsAt = endsAt;
        s.suspendedBy = adminId;
        return s;
    }

    public boolean isExpired(Instant now) {
        return endsAt != null && !endsAt.isAfter(now);
    }

    /** 기한이 지나 자동으로 풀릴 때는 liftedBy 없이 liftedAt만 기록한다. */
    public void lift(Instant now, Long adminId) {
        this.liftedAt = now;
        this.liftedBy = adminId;
    }

    public Long getId() { return id; }
    public Long getMemberId() { return memberId; }
    public String getReason() { return reason; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndsAt() { return endsAt; }
    public Long getSuspendedBy() { return suspendedBy; }
    public Instant getLiftedAt() { return liftedAt; }
    public Long getLiftedBy() { return liftedBy; }
}
