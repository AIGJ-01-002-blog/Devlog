package com.team.blog.discovery.application;

import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.stereotype.Service;

import com.team.blog.friend.application.FriendQuery;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.access.ReadablePost;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.query.PostNeighborQuery;

/**
 * 글 상세 아래의 이전·다음 글 (spec 040). 보는 사람이 그 작성자의 블로그 목록에서 보는 순서를 그대로 따른다:
 * 친구면 친구 목록(published_at), 아니면 공개 목록(first_public_at). 작성자 본인도 블로그처럼 공개 목록 기준이다 (spec 003 FR-021).
 */
@Service
public class AdjacentPostQuery {
    private final PostNeighborQuery neighbors;
    private final PostAccessPolicy policy;
    private final FriendQuery friends;

    public AdjacentPostQuery(PostNeighborQuery neighbors, PostAccessPolicy policy, FriendQuery friends) {
        this.neighbors = neighbors;
        this.policy = policy;
        this.friends = friends;
    }

    /**
     * @param prev 더 오래된 글 (velog의 "이전 포스트")
     * @param next 더 새 글
     * @param friendsView 친구에게만 보이는 글이 섞일 수 있는 답이면 true (저장하지 않는다)
     */
    public record Adjacent(PostNeighborQuery.Link prev, PostNeighborQuery.Link next, @JsonIgnore boolean friendsView) {}

    /** 글을 읽을 수 없으면 비어 있다 (호출한 쪽이 404, docs/06 R-1). */
    public Optional<Adjacent> find(long postId, Viewer viewer) {
        Optional<ReadablePost> post = neighbors.readable(postId);
        if (post.isEmpty() || !policy.canRead(post.get(), viewer)) return Optional.empty();
        boolean friend = viewer.memberId() != null && friends.areFriends(post.get().authorId(), viewer.memberId());
        PostNeighborQuery.Neighbors n = neighbors.find(postId, friend);
        return Optional.of(new Adjacent(n.prev(), n.next(), friend));
    }
}
