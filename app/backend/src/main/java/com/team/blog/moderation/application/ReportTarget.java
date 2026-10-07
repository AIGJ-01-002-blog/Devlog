package com.team.blog.moderation.application;

import java.util.Locale;
import java.util.Optional;

/** 신고 대상 종류 (FR-001). 글 42와 댓글 42는 종류로 구분한다. */
public enum ReportTarget {
    POST, COMMENT;

    public static Optional<ReportTarget> parse(String raw) {
        if (raw == null) return Optional.empty();
        try {
            return Optional.of(valueOf(raw.strip().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
