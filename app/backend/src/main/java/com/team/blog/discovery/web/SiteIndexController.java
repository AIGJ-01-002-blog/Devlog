package com.team.blog.discovery.web;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.discovery.application.SiteIndex;

/** 검색 엔진이 읽는 robots.txt와 sitemap.xml. 누구에게나 같으므로 공유 캐시에 둔다 */
@RestController
public class SiteIndexController {
    private static final MediaType XML = MediaType.parseMediaType("application/xml;charset=UTF-8");
    private static final MediaType TEXT = MediaType.parseMediaType("text/plain;charset=UTF-8");

    private final SiteIndex index;

    public SiteIndexController(SiteIndex index) {
        this.index = index;
    }

    @GetMapping("/robots.txt")
    public ResponseEntity<String> robots() {
        return ResponseEntity.ok().contentType(TEXT).cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic()).body(index.robots());
    }

    @GetMapping("/sitemap.xml")
    public ResponseEntity<String> sitemap() {
        return ResponseEntity.ok().contentType(XML).cacheControl(CacheControl.maxAge(Duration.ofMinutes(30)).cachePublic()).body(index.sitemap());
    }
}
