package com.team.blog.notification.application;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.access.ReadablePost;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.domain.PostStatus;

/**
 * 알림 만들기·지우기 (015, docs/25 §4, docs/20 §4). 사건은 커밋 뒤에 오므로 여기서 최신 상태를 다시 확인하고,
 * 사건의 도착 순서에 기대지 않는다(FR-044). 알림에는 식별자만 저장한다(FR-017).
 * <p>
 * 만들기 전 확인 순서 (FR-005): ① 본인 행동 ② 받는 사람 탈퇴 신청 ③ 행동한 사람 탈퇴 신청 ④ 받는 사람이 끈 종류 ⑤ 받는 사람이 글을 읽을 수 있나.
 */
@Service
public class NotificationService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final PostAccessPolicy policy;

    public NotificationService(JdbcTemplate jdbc, PlatformTransactionManager txManager, PostAccessPolicy policy) {
        this.jdbc = jdbc;
        // 커밋 뒤(afterCommit)에 같은 스레드에서 불려도 끝난 트랜잭션에 묻히지 않게 항상 새 트랜잭션으로 쓴다
        this.tx = new TransactionTemplate(txManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.policy = policy;
    }

    /**
     * 댓글·답글 알림 (FR-002·FR-003). 글 작성자에게 댓글 알림, 답글 대상에게 답글 알림. 둘이 같은 사람이면 답글만.
     * @param replyTarget 답글 대상(답글에 답했으면 그 작성자, 아니면 최상위 댓글 작성자). 최상위 댓글이면 null
     */
    public void commentCreated(long commentId, long postId, long postAuthorId, long actorId, Long replyTarget, Instant at) {
        if (!commentAlive(commentId)) return; // 처리 전에 지워졌거나 숨겨진 댓글
        if (replyTarget != null) createComment(NotificationType.REPLY, replyTarget, actorId, postId, commentId, at);
        if (replyTarget == null || replyTarget != postAuthorId) {
            createComment(NotificationType.COMMENT, postAuthorId, actorId, postId, commentId, at);
        }
    }

    /** 댓글이 지워지면(자리만 남는 경우 포함) 그 댓글로 생긴 알림도 지운다 (FR-013). */
    public void commentDeleted(long commentId) {
        tx.executeWithoutResult(s -> jdbc.update("DELETE FROM notification WHERE id IN (SELECT notification_id FROM notification_comment WHERE comment_id = ?)", commentId));
    }

    /**
     * 좋아요 (FR-007~FR-011). 받는 사람·글마다 안 읽은 묶음 하나에 사람을 더한다. 같은 사람은 그 글에 대해 보관 기간 안에 한 번만.
     * (받는 사람, 종류, 글) 단위 트랜잭션 잠금으로 동시에 와도 안 읽은 묶음은 하나다.
     */
    public void postLiked(long postId, long authorId, long likerId, Instant at) {
        if (!allowed(NotificationType.LIKE, authorId, likerId, postId)) return;
        tx.executeWithoutResult(s -> {
            lock(authorId, NotificationType.LIKE, postId);
            // 취소가 먼저 처리됐으면 지금은 좋아요가 없다 (FR-044)
            if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM post_like WHERE post_id = ? AND member_id = ?)",
                    Boolean.class, postId, likerId))) return;
            Boolean already = jdbc.queryForObject("""
                    SELECT EXISTS (SELECT 1 FROM notification n
                                   JOIN notification_post np ON np.notification_id = n.id AND np.post_id = ?
                                   JOIN notification_actor a ON a.notification_id = n.id AND a.actor_id = ?
                                   WHERE n.receiver_id = ? AND n.type = 'LIKE')
                    """, Boolean.class, postId, likerId, authorId);
            if (Boolean.TRUE.equals(already)) return; // FR-009
            Long open = unreadLike(authorId, postId);
            Timestamp ts = Timestamp.from(at);
            if (open == null) {
                open = insert(authorId, NotificationType.LIKE, ts);
                jdbc.update("INSERT INTO notification_post (notification_id, type, post_id) VALUES (?, 'LIKE', ?)", open, postId);
            } else {
                // 새 사람이 더해지면 맨 위로 (FR-008)
                jdbc.update("UPDATE notification SET updated_at = GREATEST(updated_at, ?) WHERE id = ?", ts, open);
            }
            jdbc.update("INSERT INTO notification_actor (notification_id, actor_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                    open, likerId, ts);
        });
    }

    /** 좋아요 취소 (FR-012): 안 읽은 묶음에서만 빼고, 0명이면 지운다. 대표·수는 참여자에서 세므로 다시 계산할 것이 없다. */
    public void postUnliked(long postId, long authorId, long likerId) {
        tx.executeWithoutResult(s -> {
            lock(authorId, NotificationType.LIKE, postId);
            // 다시 눌렀으면 그대로 둔다 (도착 순서와 상관없이 지금 상태 기준)
            if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM post_like WHERE post_id = ? AND member_id = ?)",
                    Boolean.class, postId, likerId))) return;
            Long open = unreadLike(authorId, postId);
            if (open == null) return;
            jdbc.update("DELETE FROM notification_actor WHERE notification_id = ? AND actor_id = ?", open, likerId);
            jdbc.update("DELETE FROM notification n WHERE n.id = ? AND NOT EXISTS (SELECT 1 FROM notification_actor a WHERE a.notification_id = n.id)", open);
        });
    }

    private void createComment(NotificationType type, long receiverId, long actorId, long postId, long commentId, Instant at) {
        if (!allowed(type, receiverId, actorId, postId)) return;
        tx.executeWithoutResult(s -> {
            long id = insert(receiverId, type, Timestamp.from(at));
            jdbc.update("INSERT INTO notification_comment (notification_id, type, comment_id) VALUES (?, ?, ?)", id, type.name(), commentId);
        });
    }

    /** FR-005 ①~⑤. */
    private boolean allowed(NotificationType type, long receiverId, long actorId, long postId) {
        if (receiverId == actorId) return false;
        List<Boolean> withdrawn = jdbc.query("SELECT status = 'WITHDRAWN' OR deleted_at IS NOT NULL FROM member WHERE id IN (?, ?)",
                (rs, i) -> rs.getBoolean(1), receiverId, actorId);
        if (withdrawn.size() != 2 || withdrawn.contains(true)) return false;
        if (type.mutable() && Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM notification_mute WHERE member_id = ? AND type = ?)", Boolean.class, receiverId, type.name()))) {
            return false;
        }
        return readable(postId, receiverId);
    }

    /** 글 상세와 같은 판정 (FR-005 ⑤): 발행·숨김 아님·공개 범위 규칙. */
    boolean readable(long postId, long viewerId) {
        List<ReadablePost> rows = jdbc.query("""
                SELECT p.author_id, p.status, p.visibility, p.deleted_at IS NOT NULL AS deleted, p.hidden_at IS NOT NULL AS hidden,
                       m.withdrawn_at IS NOT NULL AS withdrawn
                FROM post p JOIN member m ON m.id = p.author_id WHERE p.id = ?
                """, (rs, i) -> new ReadablePost(rs.getLong("author_id"), PostStatus.valueOf(rs.getString("status")),
                Visibility.valueOf(rs.getString("visibility")), rs.getBoolean("deleted"), rs.getBoolean("hidden"),
                rs.getBoolean("withdrawn")), postId);
        if (rows.isEmpty()) return false;
        ReadablePost p = rows.get(0);
        return p.status() == PostStatus.PUBLISHED && !p.hidden() && policy.canRead(p, new Viewer(viewerId, false));
    }

    private boolean commentAlive(long commentId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM comment WHERE id = ? AND deleted_at IS NULL AND hidden_at IS NULL)", Boolean.class, commentId));
    }

    private Long unreadLike(long receiverId, long postId) {
        return jdbc.query("""
                SELECT n.id FROM notification n JOIN notification_post np ON np.notification_id = n.id
                WHERE n.receiver_id = ? AND n.type = 'LIKE' AND n.read_at IS NULL AND np.post_id = ?
                ORDER BY n.id DESC LIMIT 1
                """, (rs, i) -> rs.getLong(1), receiverId, postId).stream().findFirst().orElse(null);
    }

    private long insert(long receiverId, NotificationType type, Timestamp at) {
        return jdbc.queryForObject("""
                INSERT INTO notification (receiver_id, type, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id
                """, Long.class, receiverId, type.name(), at, at);
    }

    private void lock(long receiverId, NotificationType type, long target) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", rs -> null,
                "notification:" + receiverId + ":" + type.name() + ":" + target);
    }
}
