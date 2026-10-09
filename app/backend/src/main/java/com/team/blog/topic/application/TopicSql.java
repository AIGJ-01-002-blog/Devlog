package com.team.blog.topic.application;

import com.team.blog.post.query.PostFilter;

/** 글 목록에 더하는 주제 브랜치 조건 (post_topic 테이블은 이 모듈만 안다, 헌법 IV). */
public final class TopicSql {
    private TopicSql() {}

    /** 글(자리표시자 하나, 글 번호)과 같은 주제 브랜치의 글 p (비슷한 글에서 뺀다, 072) */
    public static final String SAME_TOPIC_AS =
            "EXISTS (SELECT 1 FROM post_topic a JOIN post_topic b ON b.topic_key = a.topic_key WHERE a.post_id = ? AND b.post_id = p.id)";

    /** 한 주제 브랜치의 글만 (홈 브랜치 거르기, 072) */
    public static PostFilter inTopic(long topicKey) {
        return new PostFilter("EXISTS (SELECT 1 FROM post_topic pt2 WHERE pt2.post_id = p.id AND pt2.topic_key = ?)", topicKey);
    }
}
