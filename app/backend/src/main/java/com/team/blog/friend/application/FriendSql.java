package com.team.blog.friend.application;

/** 다른 모듈의 읽기 쿼리가 친구 관계를 확인할 때 쓰는 SQL 조각 (friendship 테이블은 이 모듈만 안다). */
public final class FriendSql {
    private FriendSql() {}

    /**
     * 두 회원이 수락된 친구인지. (작은 번호, 큰 번호) 한 행만 확인한다.
     *
     * @param a 회원 번호 열 (코드 안 상수만)
     * @param b 회원 번호 열 (코드 안 상수만)
     */
    public static String acceptedFriends(String a, String b) {
        return "EXISTS (SELECT 1 FROM friendship f WHERE f.status = 'ACCEPTED'"
                + " AND f.member_a_id = LEAST(" + a + ", " + b + ") AND f.member_b_id = GREATEST(" + a + ", " + b + "))";
    }
}
