package com.team.blog.post.application;

/**
 * 글을 완전히 지우기 직전에, 같은 트랜잭션 안에서 다른 기능이 자기 데이터를 정리한다 (007 FR-012·FR-013).
 * 사진 연결 끊기(009), 신고 사건 "대상 없음" 종료(019)가 이 확장으로 붙는다. 댓글·좋아요·태그 연결·작업본은 FK가 함께 지운다.
 */
public interface PurgeExtension {
    void beforePurge(long postId);
}
