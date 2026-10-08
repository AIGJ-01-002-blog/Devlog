package com.team.blog.mcp.application;

import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** (47) 탈퇴 정리 때 AI 글 제안과 아직 묶지 않은 메모를 지운다 (061). */
@Component
class AiJournalWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final AiJournal journal;

    AiJournalWithdrawalPurgeStep(AiJournal journal) {
        this.journal = journal;
    }

    @Override
    public int order() {
        return 47;
    }

    @Override
    public void purge(long memberId) {
        journal.deleteAll(memberId);
    }
}
