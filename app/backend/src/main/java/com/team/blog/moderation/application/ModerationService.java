package com.team.blog.moderation.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.time.Times;

/**
 * 관리자 신고 처리와 숨김 해제 (019 US2·US3, docs/43 §3~§4). 한 대상의 대기 사건 하나를 숨김 또는 반려로 닫는다(FR-015).
 * 자동 숨김은 없다(FR-016). 관리자는 자기 콘텐츠의 사건을 처리하거나 자기 것을 숨길 수 없다(FR-018).
 * 알림은 커밋 뒤 사건으로 만든다(FR-042).
 */
@Service
public class ModerationService {
    private final JdbcTemplate jdbc;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public ModerationService(JdbcTemplate jdbc, ApplicationEventPublisher events, Clock clock) {
        this.jdbc = jdbc;
        this.events = events;
        this.clock = clock;
    }

    public enum Action { HIDE, REJECT }

    @Transactional
    public void resolve(long adminId, long caseId, Action action, String hideReason) {
        if (action == null) throw invalid("action", "INVALID_ACTION", "처리 방법을 골라 주세요.");
        ReportReason reason = action == Action.HIDE
                ? ReportReason.parse(hideReason).orElseThrow(() -> invalid("reason", "INVALID_REASON", "숨기는 사유를 골라 주세요."))
                : null;
        CaseRow c = lock(caseId);
        if (!"PENDING".equals(c.status())) throw ApiException.conflict("CASE_ALREADY_HANDLED", "이미 처리된 신고예요.");
        if (c.authorId() == adminId) throw ApiException.badRequest("CANNOT_HANDLE_OWN", "자기 글·댓글의 신고는 처리할 수 없어요.");
        Instant now = Times.now(clock);
        Timestamp ts = Timestamp.from(now);
        if (action == Action.HIDE) {
            if (c.targetId() == null) throw ApiException.conflict("TARGET_GONE", "신고 대상이 이미 없어요.");
            // 이미 숨겨져 있으면(다른 사건으로) 처음 숨긴 기록을 그대로 둔다
            jdbc.update("UPDATE " + c.table() + " SET hidden_at = ?, hidden_by = ?, hidden_reason = ? WHERE id = ? AND hidden_at IS NULL",
                    ts, adminId, reason.name(), c.targetId());
        }
        jdbc.update("UPDATE report_case SET status = ?, handled_by = ?, handled_at = ? WHERE id = ?",
                action == Action.HIDE ? "HIDDEN" : "REJECTED", adminId, ts, caseId);
        events.publishEvent(new ModerationEvents.ReportsResolved(caseId, action == Action.HIDE, now));
        if (action == Action.HIDE) {
            events.publishEvent(new ModerationEvents.ContentHidden(caseId, c.type(), c.targetId(), c.authorId(), c.postId(), now));
        }
    }

    /** 처리됨 탭의 [숨김 해제] (FR-026·FR-027). 목록 위치는 처음 공개된 시각 그대로라 따로 고칠 것이 없다. 작성자에게 알리지 않는다. */
    @Transactional
    public void unhide(long adminId, long caseId) {
        CaseRow c = lock(caseId);
        if (!"HIDDEN".equals(c.status()) || c.targetId() == null) throw new NotFoundException();
        if (c.authorId() == adminId) throw ApiException.badRequest("CANNOT_HANDLE_OWN", "자기 글·댓글의 숨김은 바꿀 수 없어요.");
        int n = jdbc.update("UPDATE " + c.table() + " SET hidden_at = NULL, hidden_by = NULL, hidden_reason = NULL WHERE id = ? AND hidden_at IS NOT NULL",
                c.targetId());
        if (n == 0) throw ApiException.conflict("NOT_HIDDEN", "이미 숨김이 풀려 있어요.");
        events.publishEvent(new ModerationEvents.ContentUnhidden(c.type(), c.targetId(), c.authorId(), Times.now(clock)));
    }

    /** postId는 댓글이면 그 댓글의 글 */
    record CaseRow(long id, ReportTarget type, Long targetId, long authorId, String status, long postId) {
        String table() {
            return type == ReportTarget.POST ? "post" : "comment";
        }
    }

    private CaseRow lock(long caseId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT rc.id, rc.target_type, COALESCE(rc.post_id, rc.comment_id) AS target_id, rc.target_author_id, rc.status,
                       COALESCE(rc.post_id, c.post_id, 0) AS post_id
                FROM report_case rc LEFT JOIN comment c ON c.id = rc.comment_id
                WHERE rc.id = ? FOR UPDATE OF rc
                """, caseId);
        if (rows.isEmpty()) throw new NotFoundException();
        Map<String, Object> r = rows.get(0);
        Number target = (Number) r.get("target_id");
        return new CaseRow(caseId, ReportTarget.valueOf((String) r.get("target_type")), target == null ? null : target.longValue(),
                ((Number) r.get("target_author_id")).longValue(), (String) r.get("status"), ((Number) r.get("post_id")).longValue());
    }

    private static ApiException invalid(String field, String code, String message) {
        return ApiException.validation(List.of(new FieldErrorItem(field, code, message)));
    }

}
