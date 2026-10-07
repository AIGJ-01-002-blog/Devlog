package com.team.blog.support;

import java.util.Set;
import java.util.regex.Pattern;

/**
 * 브라우저가 읽는 방식대로 HTML이 위험한지 본다 (scripts/sanitize/Pipeline.java의 검사기와 같다).
 * 태그는 허용 목록, 속성 이름에 on*·style 없음, href/src는 엔티티를 풀어 위험한 프로토콜이 없어야 한다.
 */
public final class HtmlSafety {
    private static final Pattern TAG = Pattern.compile("<[a-zA-Z/][^>]*>");
    private static final Pattern TAG_NAME = Pattern.compile("^</?([a-zA-Z0-9]+)");
    private static final Pattern ATTR = Pattern.compile("([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:=\"([^\"]*)\"|='([^']*)'|=([^\\s>]+))?");
    private static final Set<String> ALLOWED_TAGS = Set.of("p", "br", "hr", "blockquote", "h2", "h3", "h4", "h5", "h6",
            "strong", "em", "del", "ul", "ol", "li", "input", "code", "pre", "table", "thead", "tbody", "tr", "th", "td", "a", "img");
    private static final Pattern BAD_PROTOCOL = Pattern.compile("(?i)^(javascript|vbscript|data):");

    /** docs/12 §9-1 공격 문자열 32개. CDN은 우리 사진 저장소 주소 접두어다. */
    public static String[] attacks(String cdn) {
        return new String[]{
                "<script>alert(1)</script>",
                "<img src=x onerror=alert(1)>",
                "<svg onload=alert(1)>",
                "<iframe src=\"javascript:alert(1)\"></iframe>",
                "<a href=\"javascript:alert(1)\">x</a>",
                "[클릭](javascript:alert(1))",
                "[클릭](JaVaScRiPt:alert(1))",
                "[클릭](&#106;avascript:alert(1))",
                "[클릭](java\nscript:alert(1))",
                "[클릭](vbscript:msgbox(1))",
                "[클릭](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
                "![x](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+)",
                "![x](javascript:alert(1))",
                "![x\" onerror=\"alert(1)](" + cdn + "a.webp)",
                "[x](" + cdn + "a.webp\" onclick=\"alert(1))",
                "<details open ontoggle=alert(1)>",
                "<div style=\"background:url(javascript:alert(1))\">x</div>",
                "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
                "<<script>script>alert(1)<</script>/script>",
                "```\n</code></pre><script>alert(1)</script>\n```",
                "<https://example.com\" onmouseover=\"alert(1)>",
                "www.example.com/\"onmouseover=\"alert(1)",
                "| a |\n|---|\n| <img src=x onerror=alert(1)> |",
                "- [x] <script>alert(1)</script>",
                "# <img src=x onerror=alert(1)>",
                "<form action=\"https://evil\"><input name=p></form>",
                "[x](&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;alert(1))",
                "[x](javascript&colon;alert(1))",
                "[x](%6A%61%76%61%73%63%72%69%70%74:alert(1))",
                "[x]( javascript:alert(1))",
                "[x](<javascript:alert(1)>)",
                "[x]: javascript:alert(1)\n\n[클릭][x]",
        };
    }

    private HtmlSafety() {}

    public static String decode(String s) {
        s = Pattern.compile("&#[xX]([0-9a-fA-F]+);?").matcher(s).replaceAll(m -> Character.toString(Integer.parseInt(m.group(1), 16)));
        s = Pattern.compile("&#(\\d+);?").matcher(s).replaceAll(m -> Character.toString(Integer.parseInt(m.group(1))));
        return s.replace("&colon;", ":").replace("&Tab;", "\t").replace("&NewLine;", "\n").replace("&quot;", "\"")
                .replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&");
    }

    public static boolean dangerous(String html) {
        var m = TAG.matcher(html);
        while (m.find()) {
            String tag = m.group();
            var nm = TAG_NAME.matcher(tag);
            if (!nm.find() || !ALLOWED_TAGS.contains(nm.group(1).toLowerCase())) return true;
            var am = ATTR.matcher(tag.substring(nm.end()));
            while (am.find()) {
                String name = am.group(1).toLowerCase();
                String val = am.group(2) != null ? am.group(2) : am.group(3) != null ? am.group(3) : am.group(4);
                if (name.startsWith("on") || name.equals("style") || name.equals("srcdoc") || name.equals("formaction")) return true;
                if ((name.equals("href") || name.equals("src")) && val != null) {
                    String v = decode(val).replaceAll("[\\s\\p{Cc}]", "");
                    if (BAD_PROTOCOL.matcher(v).find()) return true;
                }
            }
        }
        return false;
    }
}
