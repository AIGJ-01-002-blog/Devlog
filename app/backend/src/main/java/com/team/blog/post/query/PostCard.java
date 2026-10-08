package com.team.blog.post.query;

import java.time.Instant;

import com.team.blog.account.domain.Visibility;

/**
 * 목록에 나오는 글 카드 (홈·블로그·태그·팔로잉·좋아한 글·트렌딩·시리즈·검색 공용).
 *
 * @param firstPublicAt 친구 공개 글은 null (처음 전체 공개된 적이 없음)
 * @param publishedAt   처음 발행한 시각. 친구가 보는 블로그 목록은 이 순서다
 */
public record PostCard(long id, String url, String title, String excerpt, String thumbnailUrl, Instant firstPublicAt,
                       Instant publishedAt, Visibility visibility, int commentCount, int likeCount, Author author) {
    public record Author(long id, String handle, String nickname, String profileImageUrl) {}
}
