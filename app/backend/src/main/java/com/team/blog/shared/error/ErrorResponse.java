package com.team.blog.shared.error;

import java.util.List;

/** 공통 오류 본문 (docs/02 §5-1, 2026-10-07 회의 O8). */
public record ErrorResponse(String code, String message, List<FieldErrorItem> errors, Object details) {
    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(code, message, List.of(), null);
    }
}
