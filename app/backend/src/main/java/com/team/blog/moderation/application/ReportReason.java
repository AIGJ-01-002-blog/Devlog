package com.team.blog.moderation.application;

import java.util.Locale;
import java.util.Optional;

/** 신고 사유이자 숨김 사유 (019 FR-002, docs/43 H-2). DB 검사(ck_report_reason·ck_post_hidden_reason)와 같은 목록이다. */
public enum ReportReason {
    SPAM("스팸·광고"),
    ABUSE("욕설·혐오"),
    SEXUAL("음란·선정"),
    PRIVACY("개인정보 노출"),
    COPYRIGHT("저작권 침해"),
    OTHER("기타");

    private final String label;

    ReportReason(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static Optional<ReportReason> parse(String raw) {
        if (raw == null) return Optional.empty();
        try {
            return Optional.of(valueOf(raw.strip().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
