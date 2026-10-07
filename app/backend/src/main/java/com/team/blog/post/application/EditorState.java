package com.team.blog.post.application;

import java.time.Instant;

/**
 * 에디터가 이어 쓸 "지금 저장된 내용" (docs/04 §2-5 다시 열기, §2-7 충돌의 서버 쪽 내용).
 * 현재 버전 = max(Redis 자동 저장, post_draft, post). source는 어디서 읽었는지(디버깅·테스트용).
 */
public record EditorState(String title, String contentMd, long version, Instant savedAt, Source source) {
    public enum Source { AUTOSAVE, WORKING_COPY, POST }

    /** 409 VERSION_CONFLICT의 details.server 형식 (docs/05 §5). */
    public java.util.Map<String, Object> asConflictDetails() {
        java.util.Map<String, Object> server = new java.util.LinkedHashMap<>();
        server.put("title", title);
        server.put("contentMd", contentMd);
        server.put("version", version);
        server.put("savedAt", savedAt);
        return java.util.Map.of("server", server);
    }
}
