import org.commonmark.Extension;
import org.commonmark.ext.autolink.AutolinkExtension;
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension;
import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.ext.heading.anchor.HeadingAnchorExtension;
import org.commonmark.ext.task.list.items.TaskListItemsExtension;
import org.commonmark.node.*;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.AttributeProvider;
import org.commonmark.renderer.html.HtmlRenderer;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;

import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Pattern;

/**
 * docs/12-content-sanitize.md 의 정화 파이프라인 참고 구현 + 검증.
 * 렌더링(commonmark-java) → AST 변환 → 정화(OWASP) 후, XSS 공격 문자열·정상 문법·부하 제한·제목 정리를 확인한다.
 * 정책(POLICY)·변환 규칙은 12 문서 §2·§4와 같아야 한다. 문서를 바꾸면 이 파일도 함께 바꾼다.
 * 실행: scripts/sanitize/run.sh
 */
public class Pipeline {
    static final String SITE = "https://devlog.example";
    static final String CDN = "https://cdn.devlog.example/";
    static final int MAX_DEPTH = 20;

    static final List<Extension> EXT = List.of(
            TablesExtension.create(), StrikethroughExtension.create(), TaskListItemsExtension.create(),
            AutolinkExtension.create(), HeadingAnchorExtension.builder().idPrefix("h-").build());
    static final Parser PARSER = Parser.builder().extensions(EXT).build();

    static boolean external(String href) {
        return href != null && !(href.startsWith("/") || href.startsWith(SITE + "/") || href.equals(SITE) || href.startsWith("#") || href.startsWith("mailto:"));
    }

    /** ③ 후처리: 외부 링크 rel/target, 이미지 lazy */
    static final AttributeProvider ATTRS = (node, tag, attrs) -> {
        if (node instanceof Link && external(attrs.get("href"))) {
            attrs.put("target", "_blank");
            attrs.put("rel", "noopener noreferrer nofollow ugc");
        }
        if (node instanceof Image) { attrs.put("loading", "lazy"); attrs.put("decoding", "async"); }
    };
    static final HtmlRenderer RENDERER = HtmlRenderer.builder().extensions(EXT)
            .escapeHtml(true)            // S-2 A: 본문에 직접 쓴 HTML은 글자로
            .sanitizeUrls(true)          // 렌더러 단계의 1차 URL 정리 (정화가 다시 검사)
            .attributeProviderFactory(ctx -> ATTRS).build();

    static final Pattern HEADING_ID = Pattern.compile("h-[\\p{L}\\p{N}_-]{1,100}");
    static final Pattern LANG = Pattern.compile("language-[a-z0-9+#-]{1,20}");

    /** ② 정화 허용 목록 (12 문서 §4) */
    static final PolicyFactory POLICY = new HtmlPolicyBuilder()
            .allowElements("p", "br", "hr", "blockquote", "h2", "h3", "h4", "h5", "h6", "strong", "em", "del",
                    "ul", "ol", "li", "input", "code", "pre", "table", "thead", "tbody", "tr", "th", "td", "a", "img")
            .allowAttributes("id").matching(HEADING_ID).onElements("h2", "h3", "h4", "h5", "h6")
            .allowAttributes("start").matching(Pattern.compile("\\d{1,6}")).onElements("ol")
            .allowAttributes("type").matching(Pattern.compile("checkbox")).onElements("input")
            .allowAttributes("checked", "disabled").onElements("input")
            .allowAttributes("class").matching(LANG).onElements("code")
            .allowAttributes("align").matching(Pattern.compile("left|center|right")).onElements("th", "td")
            .allowUrlProtocols("http", "https", "mailto")
            .allowAttributes("href", "title").onElements("a")
            .allowAttributes("target").matching(Pattern.compile("_blank")).onElements("a")
            .allowAttributes("rel").matching(Pattern.compile("noopener noreferrer nofollow ugc")).onElements("a")
            .allowAttributes("src").matching((el, attr, v) -> v.startsWith(CDN) ? v : null).onElements("img")
            .allowAttributes("alt", "title").onElements("img")
            .allowAttributes("loading").matching(Pattern.compile("lazy")).onElements("img")
            .allowAttributes("decoding").matching(Pattern.compile("async")).onElements("img")
            .toFactory();

    static class TooComplex extends RuntimeException { TooComplex(String m) { super(m); } }

    /** AST 단계: 제목 한 단계 낮추기, 외부 이미지 → 링크, 중첩 깊이 검사 */
    static void transform(Node doc) {
        doc.accept(new AbstractVisitor() {
            int depth = 0;
            void nested(Node n) { if (++depth > MAX_DEPTH) throw new TooComplex("depth"); visitChildren(n); depth--; }
            @Override public void visit(BlockQuote n) { nested(n); }
            @Override public void visit(BulletList n) { nested(n); }
            @Override public void visit(OrderedList n) { nested(n); }
            @Override public void visit(Heading h) { h.setLevel(Math.min(h.getLevel() + 1, 6)); visitChildren(h); }
            @Override public void visit(Image img) {
                if (!img.getDestination().startsWith(CDN)) {      // S-6 A: 외부 이미지는 링크로
                    Link link = new Link(img.getDestination(), img.getTitle());
                    String alt = textOf(img);
                    link.appendChild(new Text("[이미지] " + (alt.isBlank() ? img.getDestination() : alt)));
                    img.insertAfter(link);
                    img.unlink();
                }
            }
        });
    }
    static String textOf(Node n) {
        StringBuilder sb = new StringBuilder();
        n.accept(new AbstractVisitor() { @Override public void visit(Text t) { sb.append(t.getLiteral()); } });
        return sb.toString();
    }

    static final ExecutorService EXEC = Executors.newCachedThreadPool(r -> { Thread t = new Thread(r); t.setDaemon(true); return t; });

    /** 전체 파이프라인: ① 렌더링 → ② 정화 (1초 제한) */
    static String render(String md) throws Exception {
        Future<String> f = EXEC.submit(() -> {
            Node doc = PARSER.parse(md);
            transform(doc);
            return POLICY.sanitize(RENDERER.render(doc));
        });
        try { return f.get(1, TimeUnit.SECONDS); }
        catch (ExecutionException e) { if (e.getCause() instanceof TooComplex) throw (TooComplex) e.getCause(); throw e; }
        catch (TimeoutException e) { f.cancel(true); throw new TooComplex("timeout"); }
    }

    /** 글 제목 정리 (S-10) */
    static final Pattern INVISIBLE = Pattern.compile("[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2069\\uFEFF\\p{Cc}]");
    static String cleanTitle(String t) { return INVISIBLE.matcher(Normalizer.normalize(t, Normalizer.Form.NFC)).replaceAll("").strip(); }

    // ---------------------------------------------------------------- 테스트
    static final Pattern DANGER = Pattern.compile("(?i)<script|<iframe|<svg|<math|<object|<embed|<style|<form|\\son\\w+\\s*=|javascript:|vbscript:|data:|style\\s*=|srcdoc");
    static final Pattern TAG = Pattern.compile("<[a-zA-Z/][^>]*>");
    /** 브라우저처럼 엔티티를 풀어서 본다 (&#106;avascript: 같은 인코딩 우회까지 검사) */
    static String decode(String s) {
        s = Pattern.compile("&#[xX]([0-9a-fA-F]+);?").matcher(s).replaceAll(m -> Character.toString(Integer.parseInt(m.group(1), 16)));
        s = Pattern.compile("&#(\\d+);?").matcher(s).replaceAll(m -> Character.toString(Integer.parseInt(m.group(1))));
        return s.replace("&colon;", ":").replace("&Tab;", "\t").replace("&NewLine;", "\n").replace("&quot;", "\"")
                .replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&");
    }
    static final Pattern TAG_NAME = Pattern.compile("^</?([a-zA-Z0-9]+)");
    static final Pattern ATTR = Pattern.compile("([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:=\"([^\"]*)\"|='([^']*)'|=([^\\s>]+))?");
    static final Set<String> ALLOWED_TAGS = Set.of("p","br","hr","blockquote","h2","h3","h4","h5","h6","strong","em","del",
            "ul","ol","li","input","code","pre","table","thead","tbody","tr","th","td","a","img");
    /** 브라우저가 읽는 방식대로: 태그 이름은 허용 목록, 속성 이름에 on*·style 없음, href/src 값은 엔티티를 풀어 위험한 프로토콜 없음 */
    static boolean dangerous(String html) {
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
                    if (Pattern.compile("(?i)^(javascript|vbscript|data):").matcher(v).find()) return true;
                }
            }
        }
        return false;
    }
    static int pass = 0, fail = 0;
    static void ok(boolean cond, String name, String detail) {
        if (cond) pass++; else fail++;
        System.out.printf("%s %s%s%n", cond ? "PASS" : "FAIL", name, cond ? "" : "\n     → " + detail);
    }

    public static void main(String[] a) throws Exception {
        System.out.println("=== 검사기 자체 확인 (위험한 HTML은 잡고, 안전한 HTML은 통과)");
        for (String bad : new String[]{"<img src=x onerror=alert(1)>", "<a href=\"&#106;avascript:alert(1)\">x</a>",
                "<a href=\"java&#x09;script:x\">x</a>", "<script>x</script>", "<p style=\"x\">", "<iframe src=a>"})
            ok(dangerous(bad), "위험 감지 " + bad, "놓침");
        for (String good : new String[]{"<p>&lt;script&gt;</p>", "<img src=\"" + CDN + "a.webp\" alt=\"x&#34; onerror&#61;&#34;1\" />",
                "<a href=\"/&#64;kim\">x</a>"})
            ok(!dangerous(good), "오탐 없음 " + good, "오탐");

        System.out.println("\n=== XSS 공격 문자열 (결과 HTML에 위험한 패턴이 없어야 함)");
        String[] xss = {
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
            "![x\" onerror=\"alert(1)](" + CDN + "a.webp)",
            "[x](" + CDN + "a.webp\" onclick=\"alert(1))",
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
        for (String s : xss) {
            String out = render(s);
            ok(!dangerous(out), "XSS " + s.replace("\n", "\\n"), out);
        }

        System.out.println("\n=== 정상 문법이 살아 있어야 함");
        String md = """
                # 원인
                ## 해결 방법
                **굵게** *기울임* ~~취소~~ `inline`

                | 이름 | 값 |
                |:---|---:|
                | a | 1 |

                - [x] 완료
                - [ ] 할 일

                ```java
                List<String> xs = new ArrayList<>();
                ```

                [내부](/@kim755030/posts/1) [외부](https://spring.io) https://autolink.example
                ![업로드](%sa.webp) ![외부 배지](https://img.shields.io/badge/x-y-green)

                <b>직접 쓴 HTML</b>
                """.formatted(CDN);
        String out = render(md);
        System.out.println(out);
        ok(out.contains("<h2 id=\"h-원인\">원인</h2>"), "# → h2, id에 h- 접두어 (한글 유지)", out);
        ok(out.contains("<h3 id=\"h-해결-방법\">"), "## → h3", out);
        ok(!out.contains("<h1"), "본문에 h1 없음", out);
        ok(out.contains("<strong>굵게</strong>") && out.contains("<em>기울임</em>") && out.contains("<del>취소</del>"), "굵게·기울임·취소선", out);
        ok(out.contains("<table>") && out.contains("align=\"right\""), "표 + 정렬", out);
        ok(out.contains("type=\"checkbox\"") && out.contains("disabled"), "체크리스트 (disabled)", out);
        ok(out.contains("<code class=\"language-java\">") && out.contains("List&lt;String&gt;"), "코드 블록 언어 class + 이스케이프", out);
        ok(decode(out).contains("<a href=\"/@kim755030/posts/1\">내부</a>"), "내부 링크는 rel·target 없음 (@는 &#64;로 인코딩, 브라우저가 @로 읽음)", out);
        ok(out.matches("(?s).*<a [^>]*href=\"https://spring.io\"[^>]*>.*") && out.matches("(?s).*<a rel=\"noopener noreferrer nofollow ugc\" href=\"https://spring.io\" target=\"_blank\">외부</a>.*"), "외부 링크: 새 탭 + noopener noreferrer nofollow ugc", out);
        ok(out.contains("href=\"https://autolink.example\""), "주소 자동 링크", out);
        ok(out.contains("<img src=\"" + CDN + "a.webp\"") && out.contains("loading=\"lazy\""), "우리 저장소 이미지는 img + lazy", out);
        ok(!out.contains("<img src=\"https://img.shields.io") && out.contains("[이미지] 외부 배지"), "외부 이미지는 링크로 바뀜", out);
        ok(out.contains("&lt;b&gt;직접 쓴 HTML&lt;/b&gt;"), "직접 쓴 HTML은 글자로 보임", out);

        System.out.println("\n=== 렌더링 부하 제한");
        String deep = "> ".repeat(25) + "깊은 인용";
        try { render(deep); ok(false, "인용 25단계 → 거부", "통과됨"); } catch (TooComplex e) { ok(true, "인용 25단계 → 거부 (" + e.getMessage() + ")", ""); }
        String deepList = String.join("\n", java.util.stream.IntStream.range(0, 25).mapToObj(i -> "  ".repeat(i) + "- x").toList());
        try { render(deepList); ok(false, "목록 25단계 → 거부", "통과됨"); } catch (TooComplex e) { ok(true, "목록 25단계 → 거부 (" + e.getMessage() + ")", ""); }
        ok(render("> ".repeat(15) + "적당한 인용").contains("적당한 인용"), "인용 15단계 → 허용", "");
        long t0 = System.nanoTime(); render("x ".repeat(50_000)); long ms = (System.nanoTime() - t0) / 1_000_000;
        ok(ms < 1000, "본문 10만 자 렌더링 " + ms + "ms (1초 이내)", "");

        System.out.println("\n=== 글 제목 정리");
        String rlo = "invoice‮fdp.exe";
        ok(cleanTitle(rlo).equals("invoicefdp.exe"), "방향 뒤집기 문자(U+202E) 제거", cleanTitle(rlo));
        ok(cleanTitle("관​리‍자 공지").equals("관리자 공지"), "폭이 0인 문자 제거", cleanTitle("관​리‍자 공지"));
        ok(cleanTitle(Normalizer.normalize("김민서", Normalizer.Form.NFD)).equals("김민서"), "NFD → NFC", "");

        System.out.printf("%n결과: PASS %d / FAIL %d%n", pass, fail);
        if (fail > 0) System.exit(1);
    }
}
