package com.team.blog.account.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** (16) 블로그 소개 (spec 042). 개인 글이므로 탈퇴 정리 때 지운다. 회원 행은 남으므로 따로 지운다. */
@Component
class AboutWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;

    AboutWithdrawalPurgeStep(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int order() {
        return 16;
    }

    @Override
    public void purge(long memberId) {
        jdbc.update("DELETE FROM member_about WHERE member_id = ?", memberId);
    }
}
