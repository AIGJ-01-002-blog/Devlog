package com.team.blog.inquiry.application;

import java.util.Locale;
import java.util.Optional;

/** 문의 종류 (054). REPORT는 글·댓글 [신고]로 잡히지 않는 신고(사람·기타). */
public enum InquiryCategory {
    QUESTION("문의"), BUG("버그·오류"), SUGGESTION("제안"), REPORT("신고");

    private final String label;

    InquiryCategory(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static Optional<InquiryCategory> parse(String raw) {
        if (raw == null) return Optional.empty();
        try {
            return Optional.of(valueOf(raw.strip().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
