package com.team.blog.post.query;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

/** @param friendsView 친구라서 친구 공개 글까지 보인 목록. 이런 응답은 어디에도 저장하지 않는다 */
public record PostCardPage(List<PostCard> items, String nextCursor, @JsonIgnore boolean friendsView) {
    public PostCardPage(List<PostCard> items, String nextCursor) {
        this(items, nextCursor, false);
    }
}
