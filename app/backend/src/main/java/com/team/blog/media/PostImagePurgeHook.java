package com.team.blog.media;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.post.application.PurgeExtension;

/** 완전 삭제되는 글이 쓰던 사진(본문·첨부·고른 썸네일) 중 다른 글에서 쓰지 않는 것은 연결 해제 시각을 남겨 7일 뒤 정리되게 한다 (007 FR-012). */
@Component
class PostImagePurgeHook implements PurgeExtension {
    private final JdbcTemplate jdbc;

    PostImagePurgeHook(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void beforePurge(long postId) {
        jdbc.update("""
                UPDATE resource r SET detached_at = now()
                WHERE r.id IN (SELECT resource_id FROM post_image WHERE post_id = ?
                               UNION SELECT resource_id FROM post_file WHERE post_id = ?
                               UNION SELECT resource_id FROM post_thumbnail WHERE post_id = ?)
                  AND NOT EXISTS (SELECT 1 FROM post_image o WHERE o.resource_id = r.id AND o.post_id <> ?)
                  AND NOT EXISTS (SELECT 1 FROM post_file o WHERE o.resource_id = r.id AND o.post_id <> ?)
                  AND NOT EXISTS (SELECT 1 FROM post_thumbnail o WHERE o.resource_id = r.id AND o.post_id <> ?)
                """, postId, postId, postId, postId, postId, postId);
    }
}
