package com.team.blog.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.header.HeaderWriter;
import org.springframework.stereotype.Component;

/**
 * 본문 정화의 2차 방어 (docs/12 §8, 헌법 III). 저장소 공개 주소는 정화 허용 목록과 같은 설정값을 쓴다.
 * 소셜 가입 마무리 화면에만 Google·GitHub 사진 호스트를 img-src에 더한다 (화면별 CSP, 2026-10-07 H3).
 */
@Component
public class ContentSecurityPolicy implements HeaderWriter {
    static final String SOCIAL_AVATAR_HOSTS = "https://avatars.githubusercontent.com https://lh3.googleusercontent.com";
    private final String storageOrigin;

    public ContentSecurityPolicy(@Value("${blog.image.public-base-url:}") String publicBaseUrl) {
        this.storageOrigin = origin(publicBaseUrl);
    }

    @Override
    public void writeHeaders(HttpServletRequest request, HttpServletResponse response) {
        if (response.containsHeader("Content-Security-Policy")) return;
        response.setHeader("Content-Security-Policy", policyFor(request.getRequestURI()));
    }

    public String policyFor(String path) {
        String storage = storageOrigin.isEmpty() ? "" : " " + storageOrigin;
        String imgExtra = "/signup/social".equals(path) ? " " + SOCIAL_AVATAR_HOSTS : "";
        return "default-src 'self'; script-src 'self'; connect-src 'self'" + storage
                + "; img-src 'self'" + storage + imgExtra + " data: blob:"
                + "; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'"
                + "; base-uri 'none'; form-action 'self'";
    }

    static String origin(String url) {
        if (url == null || url.isBlank()) return "";
        try {
            java.net.URI u = java.net.URI.create(url.strip());
            if (u.getScheme() == null || u.getHost() == null) return "";
            return u.getScheme() + "://" + u.getHost() + (u.getPort() > 0 ? ":" + u.getPort() : "");
        } catch (IllegalArgumentException e) {
            return "";
        }
    }
}
