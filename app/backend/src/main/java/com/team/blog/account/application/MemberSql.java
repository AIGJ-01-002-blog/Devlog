package com.team.blog.account.application;

/** 다른 모듈의 읽기 쿼리가 회원 정보를 붙일 때 쓰는 SQL 조각. 별칭 약속: 회원 m. */
public final class MemberSql {
    private MemberSql() {}

    /** 작성자 프로필 사진 (회원당 하나). PROFILE_IMAGE_KEY와 함께 쓴다. */
    public static final String PROFILE_IMAGE_JOIN = """
            LEFT JOIN member_profile_image mpi ON mpi.member_id = m.id
            LEFT JOIN resource_image mpri ON mpri.resource_id = mpi.resource_id
            LEFT JOIN resource mpr ON mpr.id = mpi.resource_id""";

    public static final String PROFILE_IMAGE_KEY = "COALESCE(mpri.thumb_storage_key, mpr.storage_key) AS profile_image_key";

    /** 지금 활동 중인 회원 (탈퇴 신청·정리되지 않음). */
    public static final String ACTIVE = "m.withdrawn_at IS NULL AND m.deleted_at IS NULL";
}
