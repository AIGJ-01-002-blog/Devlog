package com.team.blog.post.query;

import java.util.List;

/**
 * 커서로 넘기는 글 목록 하나. 정렬은 공개 목록이면 first_public_at, 친구 목록이면 published_at 최신순이고 같으면 id 큰 순.
 *
 * @param name        커서 이름. 목록마다 달라야 다른 목록의 커서를 쓸 수 없다
 * @param friendsView 친구 공개 글까지 포함한 목록(블로그 주인의 친구가 볼 때)
 * @param authorId    한 사람의 블로그면 그 사람, 아니면 null
 * @param filters     다른 모듈이 더하는 조건
 */
public record PostListSpec(String name, boolean friendsView, Long authorId, List<PostFilter> filters) {
    public static PostListSpec everyone(String name, PostFilter... filters) {
        return new PostListSpec(name, false, null, List.of(filters));
    }
}
