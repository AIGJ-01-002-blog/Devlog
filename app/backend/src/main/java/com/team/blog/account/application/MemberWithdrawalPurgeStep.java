package com.team.blog.account.application;

import java.sql.Timestamp;
import java.time.Clock;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.shared.time.Times;

/**
 * (90) 회원 행 익명 처리 (020 FR-027·FR-028·FR-031·FR-032). 앞 단계가 회원 행을 참조하므로 맨 마지막이다.
 * 닉네임·소개·닉네임 변경 일자·최근 활동 일자를 비우고 익명 처리 일자를 적는다. 블로그 주소는 영구 예약으로 남긴다.
 * 동의 기록과 정지 이력은 지우지 않는다(동의 증빙·재가입 악용 확인).
 */
@Component
class MemberWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    MemberWithdrawalPurgeStep(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Override
    public int order() {
        return 90;
    }

    @Override
    public void purge(long memberId) {
        Timestamp now = Timestamp.from(Times.now(clock));
        jdbc.update("""
                UPDATE member SET nickname = NULL, nickname_changed_at = NULL, bio = NULL, last_active_at = NULL,
                                  deleted_at = ?, updated_at = ?
                WHERE id = ? AND status = 'WITHDRAWN'
                """, now, now, memberId);
    }
}
