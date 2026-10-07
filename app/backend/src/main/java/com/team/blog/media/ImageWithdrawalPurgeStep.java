package com.team.blog.media;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;
import com.team.blog.shared.time.Times;

/**
 * (40) 탈퇴 회원이 올린 사진 전부(지금 프로필 사진 포함)를 뗀다 (020 FR-025). 저장소 파일은 사진 정리 배치가 지운다.
 * 다음 정리 때 바로 지워지도록 뗀 일자를 보관 기간보다 앞으로 적는다.
 */
@Component
class ImageWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private static final Duration OVERDUE = Duration.ofDays(Math.max(PostImageCleanupJob.DETACHED_TTL.toDays(),
            ProfileImageCleanupJob.DETACHED_TTL.toDays()) + 1);

    private final JdbcTemplate jdbc;
    private final Clock clock;

    ImageWithdrawalPurgeStep(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Override
    public int order() {
        return 40;
    }

    @Override
    public void purge(long memberId) {
        jdbc.update("DELETE FROM member_profile_image WHERE member_id = ?", memberId);
        jdbc.update("UPDATE resource SET detached_at = ? WHERE uploader_id = ?",
                Timestamp.from(Times.now(clock).minus(OVERDUE)), memberId);
    }
}
