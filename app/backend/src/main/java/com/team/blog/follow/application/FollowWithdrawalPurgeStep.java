package com.team.blog.follow.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** (65) 팔로우 관계 양방향 (020 FR-025, docs/24 §6). */
@Component
class FollowWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;

    FollowWithdrawalPurgeStep(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int order() {
        return 65;
    }

    @Override
    public void purge(long memberId) {
        jdbc.update("DELETE FROM follow WHERE follower_id = ? OR followee_id = ?", memberId, memberId);
    }
}
