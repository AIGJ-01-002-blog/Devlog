package com.team.blog.account.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** (17) 블로그 소셜 정보 (spec 043). 개인 정보이므로 탈퇴 정리 때 지운다. 회원 행은 남으므로 따로 지운다. */
@Component
class SocialLinksWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;

    SocialLinksWithdrawalPurgeStep(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int order() {
        return 17;
    }

    @Override
    public void purge(long memberId) {
        jdbc.update("DELETE FROM member_social_link WHERE member_id = ?", memberId);
    }
}
