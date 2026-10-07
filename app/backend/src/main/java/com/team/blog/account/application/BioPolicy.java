package com.team.blog.account.application;

import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.team.blog.shared.text.TextCleaner;

/**
 * 소개 규칙 (005 FR-008·FR-010, docs/11 §3). 글자만 저장하고(HTML·Markdown은 보여줄 때도 글자 그대로),
 * 정리(NFC·제어 문자 제거·앞뒤 공백 제거·각 줄 끝 공백 제거·연속 빈 줄 하나로) 뒤에 길이·줄 수·금칙어를 검사한다.
 * 예약어 검사는 하지 않는다.
 */
@Component
public class BioPolicy {
    public static final int MAX_LENGTH = 200;
    public static final int MAX_LINES = 4;
    private static final Pattern TRAILING_SPACES = Pattern.compile("[ \\t]+\\n");
    private static final Pattern BLANK_LINES = Pattern.compile("\\n{3,}");

    private final WordFilter wordFilter;

    public BioPolicy(WordFilter wordFilter) {
        this.wordFilter = wordFilter;
    }

    public enum Code {
        BIO_TOO_LONG("소개는 200자까지 쓸 수 있어요."),
        BIO_TOO_MANY_LINES("소개는 4줄까지 쓸 수 있어요."),
        BIO_BANNED_WORD("사용할 수 없는 단어가 들어 있어요.");

        private final String message;

        Code(String message) {
            this.message = message;
        }

        public String message() {
            return message;
        }
    }

    public static String normalize(String raw) {
        String s = TextCleaner.cleanMultiline(raw);
        s = TRAILING_SPACES.matcher(s).replaceAll("\n");
        return BLANK_LINES.matcher(s).replaceAll("\n\n");
    }

    /** @return 위반이면 코드, 아니면 null */
    public Code check(String normalized) {
        if (normalized.codePointCount(0, normalized.length()) > MAX_LENGTH) return Code.BIO_TOO_LONG;
        if (normalized.split("\n", -1).length > MAX_LINES) return Code.BIO_TOO_MANY_LINES;
        if (!normalized.isEmpty() && wordFilter.containsBanned(normalized)) return Code.BIO_BANNED_WORD;
        return null;
    }
}
