package com.team.blog.topic.web;

import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.topic.application.TopicQuery;

/** 주제 브랜치 (072). 공개 글만 세서 누구에게나 같다. */
@RestController
public class TopicController {
    /** 홈 옆 칸에 보이는 수 */
    static final int POPULAR_LIMIT = 5;

    private final TopicQuery topics;

    public TopicController(TopicQuery topics) {
        this.topics = topics;
    }

    @GetMapping("/api/topics/popular")
    public ResponseEntity<List<TopicQuery.Popular>> popular() {
        return ResponseEntity.ok().cacheControl(CacheControl.noCache()).body(topics.popular(POPULAR_LIMIT));
    }
}
