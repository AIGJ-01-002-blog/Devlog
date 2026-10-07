package com.team.blog.discovery.web;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.discovery.application.RssFeed;

/** RSS 구독 주소 (026). 공개 글만 담겨 누구에게나 같으므로 공유 캐시에 10분 둔다. */
@RestController
public class RssController {
    private static final MediaType RSS = MediaType.parseMediaType("application/rss+xml;charset=UTF-8");
    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic();

    private final RssFeed feed;

    public RssController(RssFeed feed) {
        this.feed = feed;
    }

    @GetMapping("/rss")
    public ResponseEntity<String> site() {
        return ResponseEntity.ok().contentType(RSS).cacheControl(CACHE).body(feed.site());
    }

    @GetMapping("/@{handle}/rss")
    public ResponseEntity<String> blog(@PathVariable String handle) {
        return feed.blog(handle.toLowerCase())
                .map(xml -> ResponseEntity.ok().contentType(RSS).cacheControl(CACHE).body(xml))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
