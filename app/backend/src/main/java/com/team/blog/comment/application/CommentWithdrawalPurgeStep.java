package com.team.blog.comment.application;

import java.sql.Timestamp;
import java.time.Clock;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;
import com.team.blog.shared.jdbc.Columns;
import com.team.blog.shared.time.Times;

/**
 * (20) 탈퇴 회원이 남의 글에 쓴 댓글 (020 FR-025). 직접 삭제(FR-034·FR-035)와 같은 규칙이다:
 * 답글은 지우고, 답글이 달린 최상위는 내용을 비운 자리로 남기고, 답글이 없으면 지운다. 답글이 모두 사라진 빈 자리도 지운다.
 * 댓글 수는 행에서 세므로(정규화 v3) 따로 줄일 칸이 없다. 내 글의 댓글은 (10)에서 글과 함께 사라졌다.
 */
@Component
class CommentWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    CommentWithdrawalPurgeStep(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Override
    public int order() {
        return 20;
    }

    @Override
    public void purge(long memberId) {
        // 답글을 지우기 전에 그 답글이 달린 최상위를 기억해 둔다 (빈 자리 정리용)
        Long[] roots = Columns.longs(jdbc, "SELECT DISTINCT parent_id FROM comment WHERE author_id = ? AND parent_id IS NOT NULL",
                memberId).toArray(Long[]::new);
        jdbc.update("DELETE FROM comment WHERE author_id = ? AND parent_id IS NOT NULL", memberId);
        jdbc.update("""
                UPDATE comment c SET content = '', deleted_at = COALESCE(c.deleted_at, ?)
                WHERE c.author_id = ? AND c.parent_id IS NULL AND EXISTS (SELECT 1 FROM comment r WHERE r.parent_id = c.id)
                """, Timestamp.from(Times.now(clock)), memberId);
        jdbc.update("""
                DELETE FROM comment c WHERE c.author_id = ? AND c.parent_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM comment r WHERE r.parent_id = c.id)
                """, memberId);
        jdbc.update(con -> {
            var ps = con.prepareStatement("""
                    DELETE FROM comment c WHERE c.id = ANY (?) AND c.deleted_at IS NOT NULL
                      AND NOT EXISTS (SELECT 1 FROM comment r WHERE r.parent_id = c.id)
                    """);
            ps.setArray(1, con.createArrayOf("bigint", roots));
            return ps;
        });
    }
}
