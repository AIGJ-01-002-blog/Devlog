package com.team.blog.support;

import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** 탈퇴 정리 중 한 단계가 실패하면 그 회원 전체가 되돌아가는지 보는 시험용 단계 (020 FR-023). 평소에는 아무것도 하지 않는다. */
@Component
public class FailingPurgeStep implements WithdrawalPurgeStep {
    public static volatile long failFor = -1;

    @Override
    public int order() {
        return 85;
    }

    @Override
    public void purge(long memberId) {
        if (memberId == failFor) throw new IllegalStateException("시험용 실패");
    }
}
