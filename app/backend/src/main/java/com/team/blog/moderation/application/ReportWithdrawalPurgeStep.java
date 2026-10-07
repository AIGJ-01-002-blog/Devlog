package com.team.blog.moderation.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/**
 * (80) 탈퇴 회원 콘텐츠의 대기 신고는 처리자 없이 "대상 없음"으로 닫고, 그 회원이 쓴 신고의 설명을 비운다 (020 FR-025).
 * 스냅샷은 닫힌 뒤 30일 규칙(ReportPurgeJob)을 그대로 따른다(FR-035). 사건·신고 행과 사유는 남긴다.
 */
@Component
class ReportWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;

    ReportWithdrawalPurgeStep(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int order() {
        return 80;
    }

    @Override
    public void purge(long memberId) {
        jdbc.update("""
                UPDATE report_case SET status = 'CLOSED_NO_TARGET', handled_at = now(), handled_by = NULL
                WHERE target_author_id = ? AND status = 'PENDING'
                """, memberId);
        jdbc.update("UPDATE report SET detail = NULL WHERE reporter_id = ? AND detail IS NOT NULL", memberId);
    }
}
