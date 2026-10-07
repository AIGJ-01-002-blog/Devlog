package com.team.blog.like.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** (30) 탈퇴 회원이 누른 좋아요 (020 FR-025). 좋아요 수는 행에서 세므로 지우면 바로 맞는다. 유예 중에는 그대로 둔다(FR-012). */
@Component
class LikeWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;

    LikeWithdrawalPurgeStep(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int order() {
        return 30;
    }

    @Override
    public void purge(long memberId) {
        jdbc.update("DELETE FROM post_like WHERE member_id = ?", memberId);
    }
}
