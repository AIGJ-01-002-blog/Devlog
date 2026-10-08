package com.team.blog.media;

import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.post.application.PublishCommand;
import com.team.blog.post.application.PublishExtension;
import com.team.blog.post.domain.Post;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.markdown.ImageUrls;
import com.team.blog.shared.markdown.RenderedContent;

/**
 * 발행할 때 작성자가 고른 썸네일을 저장한다 (047, V12 post_thumbnail).
 * 고른 사진이 없으면 행을 지워 본문 첫 사진으로 돌아가고, "썸네일 없음"은 사진 없는 행으로 남긴다.
 * 고를 수 있는 사진은 작성자가 올린 본문용 사진(POST /api/images)뿐이다. 원본·썸네일 주소 어느 쪽이든 받는다.
 */
@Component
class PostThumbnailLinker implements PublishExtension {
    private static final String FIELD = "thumbnail";

    private final JdbcTemplate jdbc;
    private final ImageUrls urls;

    PostThumbnailLinker(JdbcTemplate jdbc, ImageUrls urls) {
        this.jdbc = jdbc;
        this.urls = urls;
    }

    @Override
    public void validate(PublishCommand command, List<FieldErrorItem> errors) {
        if (command.thumbnailUrl() == null) return;
        if (command.thumbnailHidden()) {
            errors.add(new FieldErrorItem(FIELD, "THUMBNAIL_CONFLICT", "썸네일을 고르거나 없애기 중 하나만 할 수 있어요."));
        } else if (resourceOf(command.thumbnailUrl(), command.memberId()) == null) {
            errors.add(new FieldErrorItem(FIELD, "THUMBNAIL_INVALID", "여기에 올린 내 사진만 썸네일로 고를 수 있어요."));
        }
    }

    @Override
    public void onPublish(Post post, RenderedContent rendered, PublishCommand command) {
        // validate 뒤 같은 사진이 지워졌다면 본문 첫 사진으로 둔다(FK가 막기 전에 null로 거른다)
        Long chosen = command.thumbnailUrl() == null ? null : resourceOf(command.thumbnailUrl(), post.getAuthorId());
        // 바뀌어 빠진 사진은 다른 곳에서 쓰지 않으면 연결 해제 시각을 남겨 정리 배치가 7일 뒤 지운다
        jdbc.update("""
                UPDATE resource r SET detached_at = now()
                WHERE r.id = (SELECT resource_id FROM post_thumbnail WHERE post_id = ?)
                  AND r.id IS DISTINCT FROM ?
                  AND NOT EXISTS (SELECT 1 FROM post_image pi WHERE pi.resource_id = r.id)
                  AND NOT EXISTS (SELECT 1 FROM post_thumbnail o WHERE o.resource_id = r.id AND o.post_id <> ?)
                """, post.getId(), chosen, post.getId());
        jdbc.update("DELETE FROM post_thumbnail WHERE post_id = ?", post.getId());
        if (chosen != null) {
            jdbc.update("INSERT INTO post_thumbnail (post_id, resource_id) VALUES (?, ?)", post.getId(), chosen);
            jdbc.update("UPDATE resource SET detached_at = NULL WHERE id = ?", chosen);
        } else if (command.thumbnailHidden()) {
            jdbc.update("INSERT INTO post_thumbnail (post_id, resource_id) VALUES (?, NULL)", post.getId());
        }
    }

    /** @return 작성자가 올린 본문용 사진이면 그 번호, 아니면 null */
    private Long resourceOf(String url, long memberId) {
        String key = urls.keyOf(url);
        if (key == null) return null;
        return jdbc.query("""
                SELECT r.id FROM resource r JOIN resource_image ri ON ri.resource_id = r.id
                WHERE (r.storage_key = ? OR ri.thumb_storage_key = ?) AND r.uploader_id = ?
                """, rs -> rs.next() ? rs.getLong(1) : null, key, key, memberId);
    }
}
