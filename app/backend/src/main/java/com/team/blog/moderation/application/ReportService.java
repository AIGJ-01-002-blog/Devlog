package com.team.blog.moderation.application;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.access.ReadablePost;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.domain.PostStatus;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.text.TextCleaner;
import com.team.blog.shared.web.RateLimiter;

/**
 * 신고 접수 (019 US1, docs/43 §2). 대상별 신고 사건 하나(대기 중) + 회원별 신고 한 줄로 기록한다(FR-007).
 * 같은 회원이 같은 대기 사건에 다시 신고하면 아무것도 만들지 않고 같은 응답이다(FR-003). 접수는 사건을 알리지 않는다(FR-010).
 */
@Service
public class ReportService {
    static final int DETAIL_MAX = 200;
    static final int SNAPSHOT_MAX = 2000;
    private static final int PER_MINUTE = 5;
    private static final int PER_DAY = 50;

    private final JdbcTemplate jdbc;
    private final PostAccessPolicy policy;
    private final RateLimiter rateLimiter;

    public ReportService(JdbcTemplate jdbc, PostAccessPolicy policy, RateLimiter rateLimiter) {
        this.jdbc = jdbc;
        this.policy = policy;
        this.rateLimiter = rateLimiter;
    }

    public record Command(String targetType, Long targetId, String reason, String detail) {}

    @Transactional
    public void report(long reporterId, Command cmd) {
        ReportTarget type = ReportTarget.parse(cmd.targetType()).orElseThrow(() -> invalid("targetType", "INVALID_TARGET", "신고할 대상을 확인해 주세요."));
        if (cmd.targetId() == null) throw new NotFoundException();
        ReportReason reason = ReportReason.parse(cmd.reason()).orElseThrow(() -> invalid("reason", "INVALID_REASON", "신고 사유를 골라 주세요."));
        String detail = detail(reason, cmd.detail());
        rateLimiter.check("report-minute:" + reporterId, PER_MINUTE, Duration.ofMinutes(1));
        rateLimiter.check("report-day:" + reporterId, PER_DAY, Duration.ofDays(1));

        Target t = type == ReportTarget.POST ? post(cmd.targetId(), reporterId) : comment(cmd.targetId(), reporterId);
        if (t.authorId() == reporterId) throw ApiException.badRequest("CANNOT_REPORT_OWN", "자기 글이나 댓글은 신고할 수 없어요.");

        // 대기 중 사건은 대상마다 하나 (부분 고유 인덱스). 동시에 온 첫 신고는 한쪽이 기다렸다가 만들어진 사건을 쓴다
        String column = type == ReportTarget.POST ? "post_id" : "comment_id";
        Long caseId = jdbc.query("INSERT INTO report_case (target_type, " + column + ", target_author_id, snapshot_title, snapshot_content)"
                        + " VALUES (?, ?, ?, ?, ?) ON CONFLICT (" + column + ") WHERE status = 'PENDING' AND " + column + " IS NOT NULL"
                        + " DO NOTHING RETURNING id",
                (rs, i) -> rs.getLong(1), type.name(), cmd.targetId(), t.authorId(), t.title(), t.content()).stream().findFirst().orElse(null);
        if (caseId == null) {
            caseId = jdbc.queryForObject("SELECT id FROM report_case WHERE " + column + " = ? AND status = 'PENDING'", Long.class, cmd.targetId());
        }
        jdbc.update("INSERT INTO report (case_id, reporter_id, reason, detail) VALUES (?, ?, ?, ?) ON CONFLICT (case_id, reporter_id) DO NOTHING",
                caseId, reporterId, reason.name(), detail);
    }

    /** 기타만 설명 필수(200자). 다른 사유의 설명은 받지 않는다 (FR-002). */
    static String detail(ReportReason reason, String raw) {
        if (reason != ReportReason.OTHER) return null;
        String d = TextCleaner.cleanMultiline(raw);
        if (d.isEmpty()) throw invalid("detail", "DETAIL_REQUIRED", "기타 사유를 적어 주세요.");
        if (d.codePointCount(0, d.length()) > DETAIL_MAX) throw invalid("detail", "DETAIL_TOO_LONG", "설명은 " + DETAIL_MAX + "자까지 쓸 수 있어요.");
        return d;
    }

    private record Target(long authorId, String title, String content) {}

    /** 신고자가 지금 읽을 수 있는 발행 글만 (비공개·숨김·휴지통·임시는 없는 것과 같다, FR-004) */
    private Target post(long postId, long viewerId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.author_id, p.title, p.content_md, p.status, p.visibility, p.deleted_at IS NOT NULL AS deleted,
                       p.hidden_at IS NOT NULL AS hidden, m.withdrawn_at IS NOT NULL AS withdrawn
                FROM post p JOIN member m ON m.id = p.author_id WHERE p.id = ?
                """, postId);
        if (rows.isEmpty()) throw new NotFoundException();
        Map<String, Object> r = rows.get(0);
        long author = ((Number) r.get("author_id")).longValue();
        if (!visible(r, viewerId)) throw new NotFoundException();
        return new Target(author, (String) r.get("title"), cut((String) r.get("content_md")));
    }

    private Target comment(long commentId, long viewerId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT c.author_id AS comment_author, c.content, p.author_id, p.status, p.visibility, p.deleted_at IS NOT NULL AS deleted,
                       p.hidden_at IS NOT NULL AS hidden, m.withdrawn_at IS NOT NULL AS withdrawn
                FROM comment c JOIN post p ON p.id = c.post_id JOIN member m ON m.id = p.author_id
                JOIN member cm ON cm.id = c.author_id
                WHERE c.id = ? AND c.deleted_at IS NULL AND c.hidden_at IS NULL AND cm.withdrawn_at IS NULL
                """, commentId);
        if (rows.isEmpty()) throw new NotFoundException();
        Map<String, Object> r = rows.get(0);
        if (!visible(r, viewerId)) throw new NotFoundException();
        return new Target(((Number) r.get("comment_author")).longValue(), null, cut((String) r.get("content")));
    }

    private boolean visible(Map<String, Object> r, long viewerId) {
        ReadablePost p = new ReadablePost(((Number) r.get("author_id")).longValue(), PostStatus.valueOf((String) r.get("status")),
                Visibility.valueOf((String) r.get("visibility")), (Boolean) r.get("deleted"), (Boolean) r.get("hidden"), (Boolean) r.get("withdrawn"));
        // 작성자 본인은 자기 숨김·임시 글도 읽을 수 있지만 신고 대상으로는 공개 상태여야 한다
        return p.status() == PostStatus.PUBLISHED && !p.hidden() && policy.canRead(p, new Viewer(viewerId, false));
    }

    /** 글은 본문 앞 2,000자, 댓글은 내용 전체(길면 2,000자) (FR-008) */
    static String cut(String s) {
        if (s == null) return null;
        return s.codePointCount(0, s.length()) <= SNAPSHOT_MAX ? s : s.substring(0, s.offsetByCodePoints(0, SNAPSHOT_MAX));
    }

    private static ApiException invalid(String field, String code, String message) {
        return ApiException.validation(List.of(new FieldErrorItem(field, code, message)));
    }

}
