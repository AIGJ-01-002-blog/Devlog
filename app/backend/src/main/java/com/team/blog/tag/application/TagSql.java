package com.team.blog.tag.application;

import com.team.blog.post.query.PostFilter;

/** 글 목록에 더하는 태그 조건 (post_tag·tag 테이블은 이 모듈만 안다). */
public final class TagSql {
    private TagSql() {}

    /** 글의 태그 이름 배열을 tags 열로 읽는 SELECT 항목. 입력 순서대로다 (글 별칭 p) */
    public static final String NAMES_COLUMN =
            "ARRAY(SELECT t.name FROM post_tag pt JOIN tag t ON t.id = pt.tag_id WHERE pt.post_id = p.id ORDER BY pt.position) AS tags";

    /** @param name 정규화한 태그 이름 */
    public static PostFilter taggedWith(String name) {
        return new PostFilter("EXISTS (SELECT 1 FROM post_tag pt JOIN tag t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.name = ?)", name);
    }
}
