package com.team.blog.ai.web;

import java.time.Duration;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.ai.application.AiTagService;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.shared.web.RateLimiter;

/**
 * AI 태그 추천 API (018). 에디터가 지금 쓰고 있는 제목·본문·태그를 보낸다(저장 전 내용). 남의 글이면 404, 비회원은 401,
 * 이메일 인증 전은 403 EMAIL_NOT_VERIFIED(계정 상태 필터)다.
 */
@RestController
public class AiTagController {
    private static final int PER_MINUTE = 30;

    private final AiTagService service;
    private final RateLimiter rateLimiter;

    public AiTagController(AiTagService service, RateLimiter rateLimiter) {
        this.service = service;
        this.rateLimiter = rateLimiter;
    }

    public record SuggestRequest(String title, String content, List<String> tags, Boolean again) {}

    @GetMapping("/api/ai/tags/status")
    public ResponseEntity<AiTagService.Status> status(@CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.status(me.id()));
    }

    @PostMapping("/api/posts/{postId}/ai-tags")
    public ResponseEntity<AiTagService.Result> suggest(@PathVariable long postId, @RequestBody SuggestRequest body,
                                                       @CurrentMember MemberPrincipal me) {
        rateLimiter.check("ai-tags:" + me.id(), PER_MINUTE, Duration.ofMinutes(1));
        var req = new AiTagService.Request(body.title(), body.content(), body.tags(), Boolean.TRUE.equals(body.again()));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.suggest(me.id(), postId, req));
    }
}
