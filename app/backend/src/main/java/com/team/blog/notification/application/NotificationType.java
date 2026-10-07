package com.team.blog.notification.application;

import java.util.EnumSet;
import java.util.Set;

/** 알림 종류 (015 FR-002). 운영 알림(신고 결과·숨김)은 끌 수 없다(FR-035). */
public enum NotificationType {
    COMMENT, REPLY, LIKE, FOLLOW, NEW_POST, REPORT_RESOLVED, CONTENT_HIDDEN;

    public static final Set<NotificationType> MUTABLE = EnumSet.of(COMMENT, REPLY, LIKE, FOLLOW, NEW_POST);

    public boolean mutable() {
        return MUTABLE.contains(this);
    }
}
