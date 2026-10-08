package com.team.blog.post.query;

/**
 * 글 목록에 더하는 조건 하나. 다른 모듈이 자기 테이블에 대한 조건을 이 형태로 넘긴다(팔로우·태그 등):
 * 글 모듈은 그 테이블을 모르고, 그 모듈은 글 목록 쿼리를 모른다 (헌법 IV).
 *
 * @param sql 글 별칭 p를 쓰는 조건식. 자리표시자(?)는 하나이고, 코드 안 상수로만 만든다(사용자 입력을 넣지 않는다)
 * @param arg 자리표시자 값
 */
public record PostFilter(String sql, Object arg) {}
