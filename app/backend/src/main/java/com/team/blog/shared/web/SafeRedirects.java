package com.team.blog.shared.web;

/** 로그인 후 돌아갈 주소는 우리 사이트 안의 상대 경로만 허용한다 (docs/07 §6, 나민서 D-14). */
public final class SafeRedirects {
    private SafeRedirects() {}

    public static String sanitize(String target) {
        if (target == null || target.isBlank()) return "/";
        String t = target.trim();
        if (t.length() > 2000) return "/";
        if (!t.startsWith("/") || t.startsWith("//") || t.startsWith("/\\")) return "/";
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (c == '\\' || Character.isISOControl(c) || Character.isWhitespace(c)) return "/";
        }
        return t;
    }
}
