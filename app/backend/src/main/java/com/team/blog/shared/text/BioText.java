package com.team.blog.shared.text;

/** 소개 첫 줄 (사람 검색·팔로워 목록 공용). 100자를 넘으면 자르고 "…"를 붙인다. */
public final class BioText {
    private static final int MAX = 100;

    private BioText() {}

    public static String firstLine(String bio) {
        if (bio == null || bio.isBlank()) return null;
        String line = bio.strip().lines().findFirst().orElse("").strip();
        return line.codePointCount(0, line.length()) <= MAX ? line : line.substring(0, line.offsetByCodePoints(0, MAX)) + "…";
    }
}
