package com.team.blog.account.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** (50) 로그인 수단 (020 FR-025). 지우면 같은 수단으로 다시 가입할 때 새 계정이 된다(FR-034). */
@Component
class AuthIdentityWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;

    AuthIdentityWithdrawalPurgeStep(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int order() {
        return 50;
    }

    @Override
    public void purge(long memberId) {
        jdbc.update("DELETE FROM auth_identity WHERE member_id = ?", memberId);
    }
}
