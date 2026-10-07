package com.team.blog.notification.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import com.team.blog.comment.application.CommentEvents;
import com.team.blog.like.application.LikeEvents;

/**
 * 출처 기능의 사건을 커밋 뒤 따로 받아 알림을 만든다 (015 FR-041·FR-042). 롤백된 변경으로는 사건이 오지 않는다.
 * 알림이 실패해도 원래 요청은 이미 끝났으므로 경고만 남긴다(유실 허용). 알림 대상 정보(사람·내용)는 로그에 남기지 않는다.
 */
@Component
class NotificationEventListener {
    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationService notifications;

    NotificationEventListener(NotificationService notifications) {
        this.notifications = notifications;
    }

    @Async(NotificationAsyncConfig.EXECUTOR)
    @TransactionalEventListener
    public void on(CommentEvents.CommentCreated e) {
        // 답글 대상: 답글에 답했으면 그 사람, 아니면 최상위 댓글 작성자 (FR-003)
        Long target = e.rootId() == null ? null : e.replyToMemberId() != null ? e.replyToMemberId() : e.rootAuthorId();
        run("comment", () -> notifications.commentCreated(e.commentId(), e.postId(), e.postAuthorId(), e.authorId(), target, e.at()));
    }

    @Async(NotificationAsyncConfig.EXECUTOR)
    @TransactionalEventListener
    public void on(CommentEvents.CommentDeleted e) {
        run("comment-deleted", () -> notifications.commentDeleted(e.commentId()));
    }

    @Async(NotificationAsyncConfig.EXECUTOR)
    @TransactionalEventListener
    public void on(LikeEvents.PostLiked e) {
        run("like", () -> notifications.postLiked(e.postId(), e.authorId(), e.likerId(), e.at()));
    }

    @Async(NotificationAsyncConfig.EXECUTOR)
    @TransactionalEventListener
    public void on(LikeEvents.PostUnliked e) {
        run("unlike", () -> notifications.postUnliked(e.postId(), e.authorId(), e.likerId()));
    }

    private static void run(String kind, Runnable work) {
        try {
            work.run();
        } catch (RuntimeException ex) {
            log.warn("알림을 만들지 못했습니다 ({}): {}", kind, ex.getClass().getSimpleName());
        }
    }
}
