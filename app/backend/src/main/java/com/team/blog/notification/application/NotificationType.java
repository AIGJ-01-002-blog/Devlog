package com.team.blog.notification.application;

import java.util.EnumSet;
import java.util.Set;

/** 알림 종류 (015 FR-002). 운영 알림(신고 결과·숨김·문의 답변 054)은 끌 수 없다(FR-035). AI 글 제안(071)은 끌 수 있다. */
public enum NotificationType {
    COMMENT, REPLY, LIKE, FOLLOW, NEW_POST, REPORT_RESOLVED, CONTENT_HIDDEN, INQUIRY_ANSWERED, AI_PROPOSAL;

    public static final Set<NotificationType> MUTABLE = EnumSet.of(COMMENT, REPLY, LIKE, FOLLOW, NEW_POST, AI_PROPOSAL);

    public boolean mutable() {
        return MUTABLE.contains(this);
    }
}
