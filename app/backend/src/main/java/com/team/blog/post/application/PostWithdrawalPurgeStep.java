package com.team.blog.post.application;

import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/**
 * (10) 탈퇴 회원의 글 전부(휴지통 포함)를 완전 삭제한다 (020 FR-025·FR-026). 맨 먼저 돈다:
 * 글에 달린 남의 댓글·좋아요·알림이 함께 지워져 뒤 단계가 다룰 데이터가 줄어든다. 대기 신고는 완전 삭제 확장이 닫는다.
 */
@Component
class PostWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final PostTrashService trash;

    PostWithdrawalPurgeStep(PostTrashService trash) {
        this.trash = trash;
    }

    @Override
    public int order() {
        return 10;
    }

    @Override
    public void purge(long memberId) {
        trash.purgeAllOf(memberId);
    }
}
