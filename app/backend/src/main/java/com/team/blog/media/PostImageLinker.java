package com.team.blog.media;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.post.application.PublishCommand;
import com.team.blog.post.application.PublishExtension;
import com.team.blog.post.domain.Post;
import com.team.blog.shared.markdown.RenderedContent;

/**
 * 발행할 때 본문 사진을 글에 연결한다 (V3 post_image). 본문에 나온 순서가 position이고 0번이 목록 대표 사진이다.
 * 빠진 사진은 연결을 끊고 detached_at을 남겨 정리 배치가 지운다.
 */
@Component
class PostImageLinker implements PublishExtension {
    private final JdbcTemplate jdbc;

    PostImageLinker(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void onPublish(Post post, RenderedContent rendered, PublishCommand command) {
        List<String> keys = rendered.imageKeys();
        String[] keyArray = keys.toArray(String[]::new);
        // 이 글에서 빠지고 다른 글에도 없는 사진은 연결 해제 시각을 남긴다
        jdbc.update("""
                UPDATE resource r SET detached_at = now()
                WHERE r.id IN (SELECT resource_id FROM post_image WHERE post_id = ?)
                  AND NOT (r.storage_key = ANY (?))
                  AND NOT EXISTS (SELECT 1 FROM post_image o WHERE o.resource_id = r.id AND o.post_id <> ?)
                """, post.getId(), keyArray, post.getId());
        jdbc.update("DELETE FROM post_image WHERE post_id = ?", post.getId());
        if (keys.isEmpty()) return;
        // 순서는 키 배열의 위치(WITH ORDINALITY)로 정한다. 작성자 사진만 연결된다(렌더러가 이미 걸렀다)
        jdbc.update("""
                INSERT INTO post_image (post_id, resource_id, position)
                SELECT ?, ri.resource_id, (k.ord - 1)::smallint
                FROM unnest(?::varchar[]) WITH ORDINALITY AS k(storage_key, ord)
                JOIN resource r ON r.storage_key = k.storage_key AND r.uploader_id = ? AND r.kind = 'IMAGE'
                JOIN resource_image ri ON ri.resource_id = r.id
                """, post.getId(), keyArray, post.getAuthorId());
        jdbc.update("UPDATE resource SET detached_at = NULL WHERE storage_key = ANY (?) AND uploader_id = ?",
                keyArray, post.getAuthorId());
    }
}
