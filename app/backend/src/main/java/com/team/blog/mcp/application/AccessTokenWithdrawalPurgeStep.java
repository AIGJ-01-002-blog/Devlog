package com.team.blog.mcp.application;

import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** (46) 탈퇴 정리 때 개인 접근 토큰을 지운다 (052). 탈퇴 유예 동안에는 계정 상태 검사로 이미 막힌다. */
@Component
class AccessTokenWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final AccessTokens tokens;

    AccessTokenWithdrawalPurgeStep(AccessTokens tokens) {
        this.tokens = tokens;
    }

    @Override
    public int order() {
        return 46;
    }

    @Override
    public void purge(long memberId) {
        tokens.deleteAll(memberId);
    }
}
