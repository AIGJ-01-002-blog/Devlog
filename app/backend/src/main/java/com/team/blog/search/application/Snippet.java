package com.team.blog.search.application;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 검색 결과 문장 (spec 014 FR-018·FR-019, docs/33 §5). 본문(없으면 제목)에서 검색어가 처음 나온 곳의 앞뒤 40자를 잘라,
 * 검색어가 아닌 부분은 모두 이스케이프하고 검색어만 {@code <mark>}로 감싼다. 결과에는 {@code <mark>} 외 태그가 없다.
 * (원래 안은 "전체 이스케이프 후 이스케이프된 검색어에 mark"인데, 그러면 검색어 "amp"가 {@code &amp;} 안에 걸린다.
 * 원문에서 위치를 찾고 조각마다 이스케이프하면 같은 결과를 그런 경우 없이 낸다.)
 */
public final class Snippet {
    static final int CONTEXT = 40;
    private static final String ELLIPSIS = "…";

    private Snippet() {}

    /** @return 검색어가 본문에도 제목에도 없으면 본문 앞부분(강조 없음), 둘 다 비면 null */
    public static String of(String bodyText, String title, Pattern words) {
        String html = around(bodyText, words);
        if (html != null) return html;
        html = around(title, words);
        if (html != null) return html;
        if (bodyText == null || bodyText.isBlank()) return null;
        int end = offset(bodyText, 0, CONTEXT * 2);
        return escape(bodyText.substring(0, end)) + (end < bodyText.length() ? ELLIPSIS : "");
    }

    private static String around(String text, Pattern words) {
        if (text == null || text.isEmpty()) return null;
        Matcher m = words.matcher(text);
        if (!m.find()) return null;
        int start = offset(text, m.start(), -CONTEXT);
        int end = offset(text, m.end(), CONTEXT);
        StringBuilder sb = new StringBuilder();
        if (start > 0) sb.append(ELLIPSIS);
        Matcher in = words.matcher(text).region(start, end);
        int pos = start;
        while (in.find()) {
            sb.append(escape(text.substring(pos, in.start()))).append("<mark>").append(escape(in.group())).append("</mark>");
            pos = in.end();
        }
        sb.append(escape(text.substring(pos, end)));
        if (end < text.length()) sb.append(ELLIPSIS);
        return sb.toString();
    }

    /** 글자(코드 포인트) 단위로 앞뒤로 움직인 위치. 이모지·결합 문자 중간에서 자르지 않는다. */
    private static int offset(String s, int from, int codePoints) {
        int n = codePoints;
        int i = from;
        if (n >= 0) {
            while (n-- > 0 && i < s.length()) i += Character.charCount(s.codePointAt(i));
        } else {
            while (n++ < 0 && i > 0) i -= Character.charCount(s.codePointBefore(i));
        }
        return i;
    }

    static String escape(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }
}
