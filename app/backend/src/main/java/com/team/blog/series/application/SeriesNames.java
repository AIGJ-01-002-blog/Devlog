package com.team.blog.series.application;

import java.text.Normalizer;
import java.util.Locale;

import com.team.blog.shared.text.TextCleaner;

/** 시리즈 이름 정리와 주소(slug) 만들기 (024 FR-001). */
public final class SeriesNames {
    public static final int MAX_NAME = 50;

    private SeriesNames() {}

    /** 앞뒤 공백·제어 문자를 지우고 연속 공백을 하나로. */
    public static String clean(String raw) {
        if (raw == null) return "";
        return Normalizer.normalize(raw, Normalizer.Form.NFC).replaceAll("[\\p{Cntrl}\\p{Cf}]", "").strip().replaceAll("\\s+", " ");
    }

    /** 소문자, 글자·숫자 밖의 문자 묶음은 "-" 하나로. 글자·숫자가 없으면 빈 문자열. */
    public static String slug(String name) {
        String s = clean(name).toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", "-");
        return TextCleaner.trim(s, '-');
    }
}
