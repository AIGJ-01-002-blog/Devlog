package com.team.blog.topic.application;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.query.PostCard;

/** 주제 브랜치 읽기 (072). 공개 글만 세므로 누구에게나 같은 응답이다. */
@Service
public class TopicQuery {
    private final JdbcTemplate jdbc;

    public TopicQuery(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 홈 브랜치 그래프: 글마다 주제 브랜치. 묶이지 않았거나 공개 목록에 없는 글은 빠진다 */
    public Map<Long, PostCard.Branch> branchesOf(Collection<Long> postIds) {
        Map<Long, PostCard.Branch> byPost = new HashMap<>();
        if (postIds.isEmpty()) return byPost;
        jdbc.query(con -> {
            var ps = con.prepareStatement("""
                    WITH wanted AS (SELECT DISTINCT t.topic_key FROM post_topic t WHERE t.post_id = ANY (?)),
                    listed AS (
                        SELECT t.post_id, t.topic_key, t.topic_name,
                               row_number() OVER (PARTITION BY t.topic_key ORDER BY p.first_public_at, p.id) AS idx,
                               count(*) OVER (PARTITION BY t.topic_key) AS total
                        FROM post_topic t JOIN wanted w ON w.topic_key = t.topic_key
                        JOIN post p ON p.id = t.post_id JOIN member m ON m.id = p.author_id
                        WHERE\s""" + PostAccessPolicy.PUBLIC_LIST_CONDITION + """
                    )
                    SELECT post_id, topic_key, topic_name, idx, total FROM listed WHERE post_id = ANY (?) AND total > 1""");
            var arr = con.createArrayOf("bigint", postIds.toArray());
            ps.setArray(1, arr);
            ps.setArray(2, arr);
            return ps;
        }, rs -> {
            long key = rs.getLong(2);
            byPost.put(rs.getLong(1), new PostCard.Branch(PostCard.Branch.TOPIC, "t" + key, rs.getString(3), rs.getInt(4),
                    rs.getInt(5), "/?branch=t" + key));
        });
        return byPost;
    }

    /** @param postCount 공개 글 수 */
    public record Popular(String key, String name, int postCount, String url) {}

    /** 글이 많은 주제 브랜치 (홈 옆 칸 "이어지는 주제") */
    public List<Popular> popular(int limit) {
        return jdbc.query("""
                SELECT t.topic_key, min(t.topic_name) AS name, count(*) AS cnt FROM post_topic t
                JOIN post p ON p.id = t.post_id JOIN member m ON m.id = p.author_id
                WHERE\s""" + PostAccessPolicy.PUBLIC_LIST_CONDITION + """
                 GROUP BY t.topic_key HAVING count(*) > 1
                ORDER BY cnt DESC, max(p.first_public_at) DESC LIMIT ?
                """, (rs, i) -> new Popular("t" + rs.getLong(1), rs.getString(2), rs.getInt(3), "/?branch=t" + rs.getLong(1)), limit);
    }

    /** 브랜치 이름 (거른 홈 화면 제목). 없으면 null */
    public String name(long topicKey) {
        List<String> names = jdbc.queryForList("SELECT topic_name FROM post_topic WHERE topic_key = ? LIMIT 1", String.class, topicKey);
        return names.isEmpty() ? null : names.get(0);
    }
}
