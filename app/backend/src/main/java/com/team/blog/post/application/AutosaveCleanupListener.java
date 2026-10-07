package com.team.blog.post.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import com.team.blog.post.infra.AutosaveStore;

/**
 * 발행·변경 취소가 커밋된 뒤에만 자동 저장 키를 지운다. 커밋이 실패했는데 키만 사라지는 일을 막는다 (docs/05 J-5).
 * 그 사이 다른 탭에서 더 새 버전이 들어왔다면 남겨 둔다 (§7 ⑨).
 */
@Component
public class AutosaveCleanupListener {
    private static final Logger log = LoggerFactory.getLogger(AutosaveCleanupListener.class);

    private final AutosaveStore autosave;

    public AutosaveCleanupListener(AutosaveStore autosave) {
        this.autosave = autosave;
    }

    @TransactionalEventListener
    public void on(PostCommandService.AutosaveCleanup e) {
        try {
            autosave.deleteIfVersionAtMost(e.postId(), e.version());
        } catch (RuntimeException ex) {
            log.warn("자동 저장 키를 정리하지 못했습니다 (post {}). TTL이 지나면 사라집니다: {}", e.postId(), ex.getMessage());
        }
    }

    /** 완전 삭제된 글의 자동 저장 키도 커밋 뒤 지운다 (007). */
    @TransactionalEventListener
    public void on(PostLifecycleEvents.PostPurged e) {
        try {
            autosave.delete(e.postId());
            autosave.removeDirty(e.postId());
        } catch (RuntimeException ex) {
            log.warn("자동 저장 키를 정리하지 못했습니다 (post {}). TTL이 지나면 사라집니다: {}", e.postId(), ex.getMessage());
        }
    }
}
