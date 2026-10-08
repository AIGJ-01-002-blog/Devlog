package com.team.blog.post.infra;

/**
 * 읽기 쿼리가 같이 쓰는 SQL 조각 (V3 정규화). 파생 값은 저장하지 않으므로 여기서 계산한다.
 * 별칭 약속: 글 p, 회원 m.
 */
public final class PostSql {
    private PostSql() {}

    /**
     * 목록 요약 재료: 작성자가 쓴 짧은 소개(045)와, 소개가 없을 때만 원문 앞부분. 긴 글도 앞부분만 풀어 읽고,
     * 소개가 있으면 본문을 읽지 않는다. ContentRenderer.summary(summary, content_head)로 요약을 만든다.
     */
    public static final String SUMMARY_SOURCE =
            "p.summary, CASE WHEN p.summary IS NULL THEN left(p.content_md, 600) END AS content_head";

    /**
     * 대표 사진의 썸네일(없으면 원본). 작성자가 고른 사진(047 post_thumbnail)이 먼저이고, 고르지 않았으면 본문 첫 사진이다.
     * 썸네일을 없앤 글(사진 없는 post_thumbnail 행)은 NULL이다.
     */
    public static final String THUMBNAIL_KEY = """
            (SELECT COALESCE(ri.thumb_storage_key, r.storage_key)
             FROM resource_image ri
             JOIN resource r ON r.id = ri.resource_id
             WHERE ri.resource_id = COALESCE(
                 (SELECT pt.resource_id FROM post_thumbnail pt WHERE pt.post_id = p.id),
                 (SELECT pim.resource_id FROM post_image pim
                  WHERE pim.post_id = p.id AND NOT EXISTS (SELECT 1 FROM post_thumbnail pt WHERE pt.post_id = p.id)
                  ORDER BY pim.position LIMIT 1))) AS thumbnail_key""";

    /** 작성자 프로필 사진 (회원당 하나). PROFILE_IMAGE_KEY와 함께 쓴다. */
    public static final String PROFILE_IMAGE_JOIN = """
            LEFT JOIN member_profile_image mpi ON mpi.member_id = m.id
            LEFT JOIN resource_image mpri ON mpri.resource_id = mpi.resource_id
            LEFT JOIN resource mpr ON mpr.id = mpi.resource_id""";

    public static final String PROFILE_IMAGE_KEY = "COALESCE(mpri.thumb_storage_key, mpr.storage_key) AS profile_image_key";

    /** 조회수·좋아요 수·댓글 수 (post_stat 뷰). 별칭 s. */
    public static final String STAT_JOIN = "JOIN post_stat s ON s.post_id = p.id";
}
