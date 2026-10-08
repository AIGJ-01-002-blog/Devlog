package com.team.blog.revision.application;

import java.sql.Timestamp;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.post.application.PublishCommand;
import com.team.blog.post.application.PublishExtension;
import com.team.blog.post.domain.Post;
import com.team.blog.shared.markdown.RenderedContent;

/**
 * 발행·다시 발행할 때 발행본을 한 판 남긴다 (058, V16 post_revision). 발행 트랜잭션 안에서 돌아 발행과 함께 커밋·롤백된다.
 * 글 행 잠금(findOwnForUpdate) 아래에서 불리므로 판 번호 max+1이 겹치지 않는다.
 */
@Component
class PostRevisionRecorder implements PublishExtension {
    /** 글마다 남기는 최근 판 수. 넘치면 오래된 판부터 지운다. */
    static final int KEEP = 50;

    private final JdbcTemplate jdbc;

    PostRevisionRecorder(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void onPublish(Post post, RenderedContent rendered, PublishCommand command) {
        jdbc.update("""
                INSERT INTO post_revision (post_id, revision_no, title, content_md, summary, created_at)
                SELECT ?, COALESCE(MAX(revision_no), 0) + 1, ?, ?, ?, ? FROM post_revision WHERE post_id = ?
                """, post.getId(), post.getTitle(), post.getContentMd(), post.getSummary(),
                Timestamp.from(post.getUpdatedAt()), post.getId());
        jdbc.update("""
                DELETE FROM post_revision WHERE post_id = ? AND revision_no <= (
                    SELECT MAX(revision_no) - ? FROM post_revision WHERE post_id = ?)
                """, post.getId(), KEEP, post.getId());
    }
}
