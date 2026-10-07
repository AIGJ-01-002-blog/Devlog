package com.team.blog.account.application;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.markdown.ContentRenderer;
import com.team.blog.shared.markdown.RenderedHtmlCache;

/**
 * 블로그 [소개] 탭 (spec 042, velog 소개). 회원당 마크다운 하나, 비우면 행을 지운다.
 * HTML은 저장하지 않고 글과 같은 렌더러·캐시로 만든다 (V3). 사진은 본인이 올린 것만 보인다(렌더러 규칙).
 */
@Service
public class MemberAbout {
    public static final int MAX_LENGTH = 10_000;

    private final JdbcTemplate jdbc;
    private final ContentRenderer renderer;
    private final RenderedHtmlCache htmlCache;

    public MemberAbout(JdbcTemplate jdbc, ContentRenderer renderer, RenderedHtmlCache htmlCache) {
        this.jdbc = jdbc;
        this.renderer = renderer;
        this.htmlCache = htmlCache;
    }

    /**
     * @param html      비어 있으면 null
     * @param contentMd 원문. 본인에게만 준다(고치기 화면)
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record About(String html, String contentMd, Instant updatedAt, boolean mine) {}

    /** 탈퇴한 회원이나 없는 주소면 비어 있다 (블로그와 같이 404). */
    public Optional<About> of(String handle, Long viewerId) {
        record Row(long memberId, String contentMd, Long version, Timestamp updatedAt) {}
        return jdbc.query("""
                SELECT m.id, a.content_md, a.edit_version, a.updated_at
                FROM member m LEFT JOIN member_about a ON a.member_id = m.id
                WHERE m.handle = ? AND m.withdrawn_at IS NULL AND m.deleted_at IS NULL
                """, (rs, i) -> new Row(rs.getLong("id"), rs.getString("content_md"),
                (Long) rs.getObject("edit_version", Long.class), rs.getTimestamp("updated_at")), handle)
                .stream().findFirst().map(r -> {
                    boolean mine = viewerId != null && viewerId == r.memberId();
                    if (r.contentMd() == null) return new About(null, mine ? "" : null, null, mine);
                    String html = htmlCache.html(RenderedHtmlCache.aboutKey(r.memberId(), r.version()), r.memberId(), r.contentMd());
                    return new About(html, mine ? r.contentMd() : null, r.updatedAt().toInstant(), mine);
                });
    }

    /** 앞뒤 공백을 빼고 저장한다. 비우면 소개를 지운다. */
    @Transactional
    public void save(long memberId, String raw) {
        String md = raw == null ? "" : raw.replace("\r\n", "\n").strip();
        if (md.isEmpty()) {
            jdbc.update("DELETE FROM member_about WHERE member_id = ?", memberId);
            return;
        }
        if (md.codePointCount(0, md.length()) > MAX_LENGTH) {
            throw ApiException.badRequest("ABOUT_TOO_LONG", "소개는 " + MAX_LENGTH + "자까지 쓸 수 있어요.");
        }
        renderer.render(md, memberId); // 너무 복잡한 원문은 저장 전에 400 (ContentTooComplexException)
        jdbc.update("""
                INSERT INTO member_about (member_id, content_md) VALUES (?, ?)
                ON CONFLICT (member_id) DO UPDATE
                SET content_md = EXCLUDED.content_md, edit_version = member_about.edit_version + 1, updated_at = CURRENT_TIMESTAMP
                """, memberId, md);
    }
}
