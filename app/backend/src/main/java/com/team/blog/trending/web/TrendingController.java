package com.team.blog.trending.web;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.trending.application.TrendingService;

/**
 * 트렌딩 (017). 누구나 같은 결과라 잠깐 공유 캐시에 둘 수 있다(순위표가 10분마다 바뀌므로 1분).
 * 보던 순위표가 만료되면 410 TRENDING_EXPIRED이고, 화면은 안내 뒤 처음부터 다시 받는다.
 */
@RestController
public class TrendingController {
    private final TrendingService trending;

    public TrendingController(TrendingService trending) {
        this.trending = trending;
    }

    @GetMapping("/api/posts/trending")
    public ResponseEntity<TrendingService.Page> trending(@RequestParam(required = false) String cursor) {
        TrendingService.Page page = trending.page(cursor);
        CacheControl cc = page.temporary() ? CacheControl.noStore() : CacheControl.maxAge(Duration.ofMinutes(1)).cachePublic();
        return ResponseEntity.ok().cacheControl(cc).body(page);
    }
}
