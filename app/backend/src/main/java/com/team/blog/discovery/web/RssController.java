package com.team.blog.discovery.web;

import java.time.Duration;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.discovery.application.RssFeed;
import com.team.blog.page.HeadMeta;
import com.team.blog.page.SpaShell;
import com.team.blog.shared.config.BlogProperties;

/**
 * RSS 구독 주소 (026). 공개 글만 담겨 누구에게나 같으므로 공유 캐시에 10분 둔다.
 * 브라우저 주소창으로 직접 열면(Sec-Fetch-Dest: document) XML 대신 "RSS가 무엇이고 어떻게 구독하는지" 안내 화면을 준다 (062).
 * 구독 앱·크롤러는 이 머리글을 보내지 않으므로 지금처럼 XML을 받는다. ?format=xml이면 브라우저에서도 XML 그대로.
 */
@RestController
public class RssController {
    private static final MediaType RSS = MediaType.parseMediaType("application/rss+xml;charset=UTF-8");
    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic();
    static final String FETCH_DEST = "Sec-Fetch-Dest";

    private final RssFeed feed;
    private final SpaShell shell;
    private final String siteName;

    public RssController(RssFeed feed, SpaShell shell, BlogProperties props) {
        this.feed = feed;
        this.shell = shell;
        this.siteName = props.site().name();
    }

    @GetMapping("/rss")
    public ResponseEntity<String> site(@RequestHeader(value = FETCH_DEST, required = false) String dest,
                                       @RequestParam(required = false) String format) {
        if (wantsGuide(dest, format)) return guide(null);
        return xml(feed.site());
    }

    @GetMapping("/@{handle}/rss")
    public ResponseEntity<String> blog(@PathVariable String handle,
                                       @RequestHeader(value = FETCH_DEST, required = false) String dest,
                                       @RequestParam(required = false) String format) {
        String h = handle.toLowerCase();
        return feed.blog(h)
                .map(xml -> wantsGuide(dest, format) ? guide(h) : xml(xml))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    static boolean wantsGuide(String dest, String format) {
        return "document".equalsIgnoreCase(dest) && !"xml".equalsIgnoreCase(format);
    }

    private static ResponseEntity<String> xml(String body) {
        // 같은 주소가 안내 화면도 되므로 캐시가 둘을 섞지 않게 한다
        return ResponseEntity.ok().contentType(RSS).cacheControl(CACHE).header(HttpHeaders.VARY, FETCH_DEST).body(body);
    }

    /** 안내 화면은 React가 그린다. 검색 엔진이 XML 주소를 문서로 모으지 않게 수집을 막는다. */
    private ResponseEntity<String> guide(String handle) {
        String body = "<main><h1>RSS 구독 안내</h1><p>RSS 주소를 구독 앱(Feedly·Inoreader 등)에 넣으면 새 글이 올라올 때마다 받아 볼 수 있어요.</p></main>";
        String html = shell.render(HeadMeta.privatePage(siteName, "RSS 구독 안내"), body,
                handle == null ? Map.of("page", "rss") : Map.of("page", "rss", "handle", handle), null);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .cacheControl(CacheControl.noStore()).header(HttpHeaders.VARY, FETCH_DEST).body(html);
    }
}
