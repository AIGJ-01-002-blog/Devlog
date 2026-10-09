package com.team.blog.series.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** (15) 시리즈 (024 FR-006). 글 정리(10) 뒤에 남은 묶음을 지운다. series_post·그 시리즈의 구독은 함께 지워지고, 이 회원이 한 구독도 지운다 (072). */
@Component
class SeriesWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;

    SeriesWithdrawalPurgeStep(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int order() {
        return 15;
    }

    @Override
    public void purge(long memberId) {
        jdbc.update("DELETE FROM series WHERE member_id = ?", memberId);
        jdbc.update("DELETE FROM series_subscription WHERE member_id = ?", memberId);
    }
}
