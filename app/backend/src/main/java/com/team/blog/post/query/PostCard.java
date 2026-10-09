package com.team.blog.post.query;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import com.team.blog.account.domain.Visibility;

/**
 * 목록에 나오는 글 카드 (홈·블로그·태그·팔로잉·좋아한 글·트렌딩·시리즈·검색 공용).
 *
 * @param firstPublicAt 친구 공개 글은 null (처음 전체 공개된 적이 없음)
 * @param publishedAt   처음 발행한 시각. 친구가 보는 블로그 목록은 이 순서다
 * @param tags          입력 순서대로 전부. 카드에 몇 개를 보일지는 화면이 정한다
 * @param branch        홈 브랜치 그래프(072)에서 이 글이 이어지는 브랜치. 다른 목록·브랜치가 없는 글은 빠진다
 */
public record PostCard(long id, String url, String title, String excerpt, String thumbnailUrl, Instant firstPublicAt,
                       Instant publishedAt, Visibility visibility, int commentCount, int likeCount, long viewCount,
                       List<String> tags, Author author, @JsonInclude(JsonInclude.Include.NON_NULL) Branch branch) {
    public PostCard(long id, String url, String title, String excerpt, String thumbnailUrl, Instant firstPublicAt,
                    Instant publishedAt, Visibility visibility, int commentCount, int likeCount, long viewCount,
                    List<String> tags, Author author) {
        this(id, url, title, excerpt, thumbnailUrl, firstPublicAt, publishedAt, visibility, commentCount, likeCount, viewCount,
                tags, author, null);
    }

    public record Author(long id, String handle, String nickname, String profileImageUrl) {}

    /**
     * 글이 이어지는 브랜치 (072). 시리즈(작성자가 묶음) 또는 주제(서버가 비슷한 글끼리 자동으로 묶음).
     *
     * @param kind  SERIES 또는 TOPIC
     * @param key   브랜치 거르기에 쓰는 이름 (시리즈 s12, 주제 t34)
     * @param name  화면에 보이는 브랜치 이름
     * @param index 브랜치 안에서 몇 번째 글인지 (1부터, 공개 글 기준)
     * @param total 브랜치의 공개 글 수
     * @param url   브랜치 전체를 보는 주소 (시리즈 화면 또는 홈 거르기)
     */
    public record Branch(String kind, String key, String name, int index, int total, String url) {
        public static final String SERIES = "SERIES";
        public static final String TOPIC = "TOPIC";
    }

    public PostCard withBranch(Branch b) {
        return new PostCard(id, url, title, excerpt, thumbnailUrl, firstPublicAt, publishedAt, visibility, commentCount, likeCount,
                viewCount, tags, author, b);
    }
}
