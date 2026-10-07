package com.team.blog.shared.markdown;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 발행본 HTML 캐시 (V3: content_html을 저장하지 않는다). 키에 글 버전과 렌더링 규칙 버전이 들어가므로
 * 글을 고치거나 규칙을 바꾸면 새 키를 쓰고 옛 키는 TTL로 사라진다. 지워져도 원문에서 다시 만든다.
 * Redis가 안 되면 매번 렌더링한다 (헌법 V: 보조 저장소 장애가 읽기를 막지 않는다).
 */
@Component
public class RenderedHtmlCache {
    private static final Logger log = LoggerFactory.getLogger(RenderedHtmlCache.class);
    static final Duration TTL = Duration.ofDays(7);

    private final StringRedisTemplate redis;
    private final ContentRenderer renderer;

    public RenderedHtmlCache(StringRedisTemplate redis, ContentRenderer renderer) {
        this.redis = redis;
        this.renderer = renderer;
    }

    public static String key(long postId, long editVersion) {
        return "render:post:" + postId + ":" + editVersion + ":" + ContentRenderer.RENDER_VERSION;
    }

    public String html(long postId, long editVersion, long authorId, String contentMd) {
        String key = key(postId, editVersion);
        try {
            String cached = redis.opsForValue().get(key);
            if (cached != null) return cached;
        } catch (RuntimeException e) {
            log.debug("render cache read failed: {}", e.toString());
        }
        String html = render(authorId, contentMd);
        try {
            redis.opsForValue().set(key, html, TTL);
        } catch (RuntimeException e) {
            log.debug("render cache write failed: {}", e.toString());
        }
        return html;
    }

    private String render(long authorId, String contentMd) {
        try {
            return renderer.render(contentMd, authorId).html();
        } catch (ContentTooComplexException e) {
            // 발행 때 통과한 글이 규칙 변경으로 너무 복잡해진 경우: 본문을 글자 그대로 보여 준다
            return "<pre>" + escape(contentMd) + "</pre>";
        }
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
