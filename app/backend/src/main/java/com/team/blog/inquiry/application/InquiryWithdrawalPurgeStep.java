package com.team.blog.inquiry.application;

import org.springframework.stereotype.Component;

import com.team.blog.account.application.WithdrawalPurgeStep;

/** (75) 탈퇴 정리 때 회원이 남긴 문의·신고를 지운다 (054). 받은 알림(70) 다음이다. 고친 내용은 릴리스 노트에 남는다. */
@Component
class InquiryWithdrawalPurgeStep implements WithdrawalPurgeStep {
    private final InquiryService inquiries;

    InquiryWithdrawalPurgeStep(InquiryService inquiries) {
        this.inquiries = inquiries;
    }

    @Override
    public int order() {
        return 75;
    }

    @Override
    public void purge(long memberId) {
        inquiries.deleteAll(memberId);
    }
}
