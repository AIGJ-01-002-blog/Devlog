package com.team.blog.account.application;

import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.shared.jdbc.Columns;
import com.team.blog.shared.markdown.ImageUrls;

/** 블로그 머리에 쓰는 회원 정보 (프로필 사진 주소 포함, 쿼리 1번). 탈퇴 신청했거나 정리된 회원은 없는 것으로 본다. */
@Service
public class MemberProfileQuery {
    private final JdbcTemplate jdbc;
    private final ImageUrls imageUrls;

    public MemberProfileQuery(JdbcTemplate jdbc, ImageUrls imageUrls) {
        this.jdbc = jdbc;
        this.imageUrls = imageUrls;
    }

    public record Profile(long id, String handle, String nickname, String bio, String profileImageUrl) {}

    /** 주소의 아이디 그대로(대소문자 구분) 찾는다. */
    public Optional<Long> activeId(String handle) {
        return Columns.firstLong(jdbc, "SELECT m.id FROM member m WHERE m.handle = ? AND " + MemberSql.ACTIVE, handle);
    }

    public Optional<Profile> findActive(String handle) {
        return jdbc.query("SELECT m.id, m.handle, m.nickname, m.bio, " + MemberSql.PROFILE_IMAGE_KEY + " FROM member m "
                        + MemberSql.PROFILE_IMAGE_JOIN + " WHERE m.handle = ? AND " + MemberSql.ACTIVE,
                (rs, i) -> new Profile(rs.getLong("id"), rs.getString("handle"), rs.getString("nickname"), rs.getString("bio"),
                        imageUrls.urlOf(rs.getString("profile_image_key"))), handle).stream().findFirst();
    }
}
