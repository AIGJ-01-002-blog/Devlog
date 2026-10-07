package com.team.blog.post.web;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.markdown.ContentRenderer;
import com.team.blog.shared.markdown.RenderedContent;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.shared.web.RateLimiter;

/**
 * 미리보기 (spec 002 FR-003). 발행과 같은 ContentRenderer로 만들어 결과가 100% 같다.
 * 로그인한 사용자만, 분당 60번 (docs/12 §6).
 */
@RestController
public class MarkdownController {
    private final ContentRenderer renderer;
    private final RateLimiter rateLimiter;
    private final BlogProperties.Post rules;

    public MarkdownController(ContentRenderer renderer, RateLimiter rateLimiter, BlogProperties props) {
        this.renderer = renderer;
        this.rateLimiter = rateLimiter;
        this.rules = props.post();
    }

    public record PreviewRequest(String contentMd) {}

    @PostMapping("/api/markdown/preview")
    public Map<String, Object> preview(@CurrentMember MemberPrincipal me, @RequestBody PreviewRequest body,
                                       HttpServletRequest request) {
        if (request.getContentLengthLong() > PostController.MAX_BODY_BYTES) {
            throw new ApiException(org.springframework.http.HttpStatus.CONTENT_TOO_LARGE, "PAYLOAD_TOO_LARGE", "요청이 너무 커요.");
        }
        rateLimiter.check("preview:" + me.id(), rules.previewRateLimitPerMinute(), Duration.ofMinutes(1));
        String md = body.contentMd() == null ? "" : body.contentMd().replace("\u0000", "");
        if (md.codePointCount(0, md.length()) > rules.maxContentLength()) {
            throw ApiException.validation(List.of(new FieldErrorItem("contentMd", "CONTENT_TOO_LONG",
                    "본문은 " + String.format("%,d", rules.maxContentLength()) + "자까지 쓸 수 있어요.")));
        }
        RenderedContent r = renderer.render(md, me.id());
        return Map.of("html", r.html(), "excerpt", r.excerpt() == null ? "" : r.excerpt());
    }
}
