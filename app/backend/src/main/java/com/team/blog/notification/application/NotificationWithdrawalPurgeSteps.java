package com.team.blog.notification.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/**
 * 탈퇴 30일 뒤 알림 정리 (020 FR-025, docs/25 §8). 알림 대상 표(notification_post·notification_comment)는 글·댓글이 지워질 때
 * 함께 지워지지만 알림 행은 남으므로, 대상이 사라지기 전(5)에 그 회원의 글·댓글을 가리키는 알림을 먼저 지운다.
 */
final class NotificationWithdrawalPurgeSteps {
    private NotificationWithdrawalPurgeSteps() {}

    /** (5) 내 글과 내 글의 댓글, 내가 쓴 댓글을 가리키는 알림 (남에게 간 새 글·댓글·답글·좋아요 알림 포함). (10) 글 삭제보다 먼저 돈다. */
    @Component
    static class Targets implements WithdrawalPurgeStep {
        private final JdbcTemplate jdbc;

        Targets(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        @Override
        public int order() {
            return 5;
        }

        @Override
        public void purge(long memberId) {
            jdbc.update("""
                    DELETE FROM notification WHERE id IN (
                        SELECT np.notification_id FROM notification_post np JOIN post p ON p.id = np.post_id WHERE p.author_id = ?
                        UNION
                        SELECT nc.notification_id FROM notification_comment nc
                        JOIN comment c ON c.id = nc.comment_id JOIN post p ON p.id = c.post_id
                        WHERE p.author_id = ? OR c.author_id = ?)
                    """, memberId, memberId, memberId);
        }
    }

    /** (70) 받은 알림과 알림 설정을 지우고, 남의 묶음 알림에서 나를 뺀다. 남은 사람이 없는 묶음은 지운다. 글·댓글 단계 다음. */
    @Component
    static class Received implements WithdrawalPurgeStep {
        private final JdbcTemplate jdbc;

        Received(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        @Override
        public int order() {
            return 70;
        }

        @Override
        public void purge(long memberId) {
            jdbc.update("DELETE FROM notification WHERE receiver_id = ?", memberId);
            jdbc.update("DELETE FROM notification_mute WHERE member_id = ?", memberId);
            jdbc.update("""
                    WITH gone AS (DELETE FROM notification_actor WHERE actor_id = ? RETURNING notification_id)
                    DELETE FROM notification n WHERE n.id IN (SELECT notification_id FROM gone)
                      AND NOT EXISTS (SELECT 1 FROM notification_actor a WHERE a.notification_id = n.id AND a.actor_id <> ?)
                    """, memberId, memberId);
        }
    }
}
