package com.team.blog.discord.application;

import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** (44) 탈퇴 정리 때 디스코드 웹훅 연결을 지운다 (078). 탈퇴 유예 동안은 남겨 복구하면 그대로 쓴다. */
@Component
class DiscordWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final DiscordLinks links;

    DiscordWithdrawalPurgeStep(DiscordLinks links) {
        this.links = links;
    }

    @Override
    public int order() {
        return 44;
    }

    @Override
    public void purge(long memberId) {
        links.unlink(memberId);
    }
}
