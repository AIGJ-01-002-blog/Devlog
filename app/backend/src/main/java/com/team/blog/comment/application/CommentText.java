package com.team.blog.comment.application;

import java.util.regex.Pattern;

import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.text.TextCleaner;

/**
 * 댓글 내용 정리와 검사 (docs/21 §4, 011 FR-006~FR-009). NFC → 보이지 않는 글자 제거(줄바꿈은 남김) → \r\n은 \n →
 * 앞뒤 공백 → 빈 줄 여러 개는 하나. 길이는 글자(코드 포인트) 단위 1~1000자. 금칙어 필터는 두지 않는다.
 */
public final class CommentText {
    public static final int MAX_LENGTH = 1000;
    private static final Pattern BLANK_LINES = Pattern.compile("\\n[ \\t]*(\\n[ \\t]*)+\\n");

    private CommentText() {}

    public static String clean(String raw) {
        String s = TextCleaner.cleanMultiline(raw);
        return BLANK_LINES.matcher(s).replaceAll("\n\n");
    }

    /** 정리한 내용을 돌려주고, 비었거나 너무 길면 400. */
    public static String validate(String raw) {
        String s = clean(raw);
        if (s.isEmpty()) throw ApiException.badRequest("COMMENT_REQUIRED", "댓글 내용을 입력해 주세요.");
        if (s.codePointCount(0, s.length()) > MAX_LENGTH) {
            throw ApiException.badRequest("COMMENT_TOO_LONG", "댓글은 " + MAX_LENGTH + "자까지 쓸 수 있어요.");
        }
        return s;
    }
}
