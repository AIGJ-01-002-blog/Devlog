package com.team.blog.telegram.application;

import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** (45) 탈퇴 정리 때 텔레그램 연결을 지운다 (023 FR-008). 탈퇴 유예 동안은 남겨 복구하면 그대로 쓴다. */
@Component
class TelegramWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final TelegramLinks links;

    TelegramWithdrawalPurgeStep(TelegramLinks links) {
        this.links = links;
    }

    @Override
    public int order() {
        return 45;
    }

    @Override
    public void purge(long memberId) {
        links.unlink(memberId);
    }
}
