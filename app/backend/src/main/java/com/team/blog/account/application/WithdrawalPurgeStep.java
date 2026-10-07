package com.team.blog.account.application;

/**
 * 탈퇴 30일 뒤 정리 단계 (020 FR-024, docs/44 §4). 각 기능이 자기 데이터를 지우는 단계를 빈으로 등록하면
 * {@link WithdrawalPurgeJob}이 {@link #order()} 순서대로, 회원 한 명당 한 트랜잭션 안에서 부른다.
 * 번호는 10 단위로 두고 새 단계는 사이 값을 쓴다(기존 번호를 바꾸지 않는다). 사건을 만들지 않는다(FR-029).
 */
public interface WithdrawalPurgeStep {
    int order();

    /** 호출한 쪽의 트랜잭션 안에서 실행한다. 예외를 던지면 그 회원의 앞 단계까지 모두 취소된다. */
    void purge(long memberId);
}
