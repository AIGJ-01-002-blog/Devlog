package com.team.blog.shared.text;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * 글자만 다루는 입력(글 제목, 소개 등)의 정리 (docs/12 §7-4, S-10).
 * NFC → 보이지 않는 글자·방향 제어 문자·제어 문자 제거 → 앞뒤 공백 제거.
 */
public final class TextCleaner {
    private static final Pattern INVISIBLE = Pattern.compile("[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2069\\uFEFF\\p{Cc}]");
    private static final Pattern INVISIBLE_KEEP_NEWLINE =
            Pattern.compile("[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2069\\uFEFF\\x00-\\x09\\x0B-\\x1F\\x7F]");

    private TextCleaner() {}

    public static String cleanLine(String raw) {
        if (raw == null) return "";
        return INVISIBLE.matcher(Normalizer.normalize(raw, Normalizer.Form.NFC)).replaceAll("").strip();
    }

    /** 줄바꿈(\n)은 남기고 나머지 제어 문자를 지운다 (소개·댓글처럼 여러 줄 글자). */
    public static String cleanMultiline(String raw) {
        if (raw == null) return "";
        String n = Normalizer.normalize(raw.replace("\r\n", "\n").replace('\r', '\n'), Normalizer.Form.NFC);
        return INVISIBLE_KEEP_NEWLINE.matcher(n).replaceAll("").strip();
    }
}
