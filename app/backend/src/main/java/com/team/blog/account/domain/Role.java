package com.team.blog.account.domain;

/**
 * 회원 권한 (062). 관리자(ADMIN)는 운영자 계정 하나이고 권한을 줄 수 있다. 매니저(MANAGER)는 관리자 페이지에서 글·신고·회원·문의를
 * 관리하지만 권한은 주지 못한다.
 */
public enum Role {
    USER, MANAGER, ADMIN;

    /** 관리자 페이지를 쓸 수 있는 권한 */
    public boolean staff() {
        return this != USER;
    }
}
