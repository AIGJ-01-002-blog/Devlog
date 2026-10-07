package com.team.blog.friend.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** (60) 친구 관계: 요청 중·수락 모두, 양쪽 (020 FR-025). */
@Component
class FriendshipWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;

    FriendshipWithdrawalPurgeStep(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public int order() {
        return 60;
    }

    @Override
    public void purge(long memberId) {
        jdbc.update("DELETE FROM friendship WHERE member_a_id = ? OR member_b_id = ?", memberId, memberId);
    }
}
