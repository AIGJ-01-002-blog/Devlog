package com.team.blog.account.application;

import java.util.Locale;
import java.util.regex.Pattern;

/** 이메일 정리·형식 (docs/07 §3, 004 FR-005): 앞뒤 공백 제거·소문자, 최대 254자, 일반적인 형식. */
public final class EmailAddress {
    private static final Pattern FORMAT = Pattern.compile("^[a-z0-9._%+\\-']{1,64}@[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?)++$");
    public static final int MAX = 254;

    private EmailAddress() {}

    public static String normalize(String raw) {
        return raw == null ? "" : raw.strip().toLowerCase(Locale.ROOT);
    }

    /** @param normalized normalize를 거친 값 */
    public static boolean isValid(String normalized) {
        return normalized.length() <= MAX && FORMAT.matcher(normalized).matches();
    }

    public static String localPart(String email) {
        if (email == null) return "";
        int at = email.indexOf('@');
        return at < 0 ? email : email.substring(0, at);
    }
}
