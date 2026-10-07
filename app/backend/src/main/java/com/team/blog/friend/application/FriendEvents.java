package com.team.blog.friend.application;

import java.time.Instant;

/**
 * 친구 사건 (docs/20 §3-7, 008 FR-014). 관계가 실제로 생기거나 수락된 경우에만 트랜잭션 안에서 발행하고,
 * 받는 쪽(친구 알림, 선택 기능)은 커밋 뒤에 처리한다. 거절·취소·끊기는 사건이 없다 (상대에게 드러나지 않게).
 */
public final class FriendEvents {
    private FriendEvents() {}

    public record FriendRequested(long requesterId, long receiverId, Instant at) {}

    /** 맞요청으로 바로 수락된 경우도 포함한다. */
    public record FriendAccepted(long requesterId, long accepterId, Instant at) {}
}
