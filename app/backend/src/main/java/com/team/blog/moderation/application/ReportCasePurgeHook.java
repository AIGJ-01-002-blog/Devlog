package com.team.blog.moderation.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.post.application.PurgeExtension;

/**
 * 완전 삭제되는 글과 그 글 댓글에 걸린 대기 중 신고는 처리한 관리자 없이 "대상 없음"으로 종료한다 (007 FR-013, docs/43).
 * 신고 기능(019)이 들어오기 전에도 테이블은 있으므로 처음부터 같은 규칙을 지킨다.
 */
@Component
class ReportCasePurgeHook implements PurgeExtension {
    private final JdbcTemplate jdbc;

    ReportCasePurgeHook(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void beforePurge(long postId) {
        jdbc.update("""
                UPDATE report_case SET status = 'CLOSED_NO_TARGET', handled_at = now(), handled_by = NULL
                WHERE status = 'PENDING'
                  AND (post_id = ? OR comment_id IN (SELECT id FROM comment WHERE post_id = ?))
                """, postId, postId);
    }
}
