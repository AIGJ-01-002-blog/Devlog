package com.team.blog.discovery.application;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.follow.application.FollowQuery;
import com.team.blog.friend.application.FriendQuery;
import com.team.blog.friend.application.FriendService;
import com.team.blog.friend.application.FriendsVisibilityRule;
import com.team.blog.account.domain.Visibility;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.cursor.CursorCodec;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.post.infra.PostSql;
import com.team.blog.shared.markdown.ContentRenderer;
import com.team.blog.shared.markdown.ImageUrls;
import com.team.blog.shared.time.Times;

/**
 * 홈(전체 글)과 개인 블로그 목록 (docs/10 §4·§5·§7). 목록당 쿼리 1번(글 + 작성자 + 프로필 사진 + 수),
 * 본문은 앞 600자만 읽어 요약을 만든다(V3: 요약·대표 사진·수를 저장하지 않는다). 정렬은 first_public_at 최신순, 같으면 id 큰 순. 9개씩, 10개를 읽어 다음 페이지 여부를 판단한다.
 * 작성자 본인이 봐도 블로그에는 공개 글만 나온다 (spec 003 FR-021).
 */
@Service
public class FeedQuery {
    private static final String CARD_SELECT =
            "SELECT p.id, p.title, p.first_public_at, p.published_at, p.visibility, s.comment_count, s.like_count, m.id AS author_id, m.handle, m.nickname, "
            + PostSql.CONTENT_HEAD + ", " + PostSql.THUMBNAIL_KEY + ", " + PostSql.PROFILE_IMAGE_KEY
            + " FROM post p JOIN member m ON m.id = p.author_id " + PostSql.STAT_JOIN + " " + PostSql.PROFILE_IMAGE_JOIN
            + " WHERE ";
    /** 친구가 보는 블로그 목록 조건 (docs/06 §6-3). ix_post_blog_friends의 WHERE를 그대로 포함한다. */
    static final String FRIENDS_BLOG_CONDITION =
            "p.status = 'PUBLISHED' AND p.visibility IN ('PUBLIC', 'FRIENDS') AND p.deleted_at IS NULL AND p.hidden_at IS NULL"
                    + " AND m.withdrawn_at IS NULL";

    private final JdbcTemplate jdbc;
    private final CursorCodec cursors;
    private final ImageUrls imageUrls;
    private final ContentRenderer renderer;
    private final int pageSize;
    private final FriendService friends;
    private final FriendQuery friendQuery;
    private final FollowQuery follows;

    public FeedQuery(JdbcTemplate jdbc, CursorCodec cursors, ImageUrls imageUrls, ContentRenderer renderer,
                     BlogProperties props, FriendService friends, FriendQuery friendQuery, FollowQuery follows) {
        this.jdbc = jdbc;
        this.follows = follows;
        this.friends = friends;
        this.friendQuery = friendQuery;
        this.cursors = cursors;
        this.imageUrls = imageUrls;
        this.renderer = renderer;
        this.pageSize = props.feed().pageSize();
    }

    public record Author(long id, String handle, String nickname, String profileImageUrl) {}

    /**
     * @param firstPublicAt 친구 공개 글은 null (처음 전체 공개된 적이 없음)
     * @param publishedAt   처음 발행한 시각. 친구가 보는 블로그 목록은 이 순서다
     */
    public record Card(long id, String url, String title, String excerpt, String thumbnailUrl, Instant firstPublicAt,
                       Instant publishedAt, Visibility visibility, int commentCount, int likeCount, Author author) {}

    /** @param friendsView 친구라서 친구 공개 글까지 보인 목록. 이런 응답은 어디에도 저장하지 않는다 */
    public record Page(List<Card> items, String nextCursor, @JsonIgnore boolean friendsView) {
        public Page(List<Card> items, String nextCursor) {
            this(items, nextCursor, false);
        }
    }

    /**
     * @param friendship        보는 사람 기준 친구 관계 (NONE·SENT·RECEIVED·FRIENDS). 비회원·본인이면 null
     * @param lastActiveDaysAgo 친구이고 양쪽 모두 공개 설정을 켰을 때만 0~7 (008 FR-009·FR-010)
     */
    public record BlogProfile(long id, String handle, String nickname, String bio, String profileImageUrl,
                              long publicPostCount, boolean mine, String friendship, Integer lastActiveDaysAgo,
                              long followerCount, long followingCount, boolean following) {
        /** 친구가 보면 친구 공개 글까지 센 수 (docs/06 §3 "블로그 글 수") */
        BlogProfile withPostCount(long count) {
            return new BlogProfile(id, handle, nickname, bio, profileImageUrl, count, mine, friendship, lastActiveDaysAgo,
                    followerCount, followingCount, following);
        }

        BlogProfile withFriendship(String relation, Integer days) {
            return new BlogProfile(id, handle, nickname, bio, profileImageUrl, publicPostCount, mine, relation, days,
                    followerCount, followingCount, following);
        }

        /** 팔로워·팔로잉 수는 비회원도 본다 (016 FR-010). following은 보는 사람이 팔로우 중인지. */
        BlogProfile withFollow(FollowQuery.Counts counts, boolean viewerFollows) {
            return new BlogProfile(id, handle, nickname, bio, profileImageUrl, publicPostCount, mine, friendship, lastActiveDaysAgo,
                    counts.followers(), counts.following(), viewerFollows);
        }
    }

    /**
     * 번호로 카드 읽기 (트렌딩 순위표). 한 번의 조회로 읽고 지금 공개 목록 조건을 다시 확인해, 그 사이 볼 수 없게 된 글은 빠진다.
     * 순서는 받은 번호 순서 그대로다.
     */
    public List<Card> publicCards(List<Long> ids) {
        if (ids.isEmpty()) return List.of();
        List<Card> found = jdbc.query(con -> {
            var ps = con.prepareStatement(CARD_SELECT + PostAccessPolicy.PUBLIC_LIST_CONDITION + " AND p.id = ANY (?)");
            ps.setArray(1, con.createArrayOf("bigint", ids.toArray()));
            return ps;
        }, this::card);
        java.util.Map<Long, Card> byId = new java.util.HashMap<>();
        found.forEach(c -> byId.put(c.id(), c));
        return ids.stream().map(byId::get).filter(java.util.Objects::nonNull).toList();
    }

    public Page home(String cursor) {
        return list("home", null, null, cursor, false);
    }

    public Page blog(String handle, String cursor) {
        return blog(handle, null, cursor, null);
    }

    /**
     * @param tag      정규화한 태그 이름. null이면 거르지 않는다 (010 블로그 안 태그 필터)
     * @param viewerId 보는 사람. 블로그 주인과 수락된 친구면 친구 공개 글도 함께 나온다 (docs/06 §3)
     */
    public Page blog(String handle, String tag, String cursor, Long viewerId) {
        long authorId = findBlogOwner(handle).orElseThrow(NotFoundException::new);
        boolean friend = viewerId != null && FriendsVisibilityRule.areFriends(jdbc, authorId, viewerId);
        // 목록 이름이 달라 친구 목록 커서를 공개 목록에 쓸 수 없다 (정렬 기준도 다름)
        String name = (friend ? "blogf:" : "blog:") + authorId + (tag == null ? "" : ":tag:" + tag);
        return list(name, authorId, tag, cursor, friend);
    }

    /** 태그별 목록 (010 FR-019). 없는 태그도 빈 목록이라 비공개 글에만 쓰인 태그와 구별되지 않는다. */
    public Page tag(String tag, String cursor) {
        return list("tag:" + tag, null, tag, cursor, false);
    }

    public Optional<BlogProfile> profile(String handle, Long viewerId) {
        List<BlogProfile> rows = jdbc.query("""
                SELECT m.id, m.handle, m.nickname, m.bio, """ + PostSql.PROFILE_IMAGE_KEY + """
                       , (SELECT count(*) FROM post p WHERE p.author_id = m.id AND """ + " " + PostAccessPolicy.PUBLIC_LIST_CONDITION + """
                       ) AS post_count
                FROM member m
                """ + PostSql.PROFILE_IMAGE_JOIN + """

                WHERE m.handle = ? AND m.withdrawn_at IS NULL AND m.deleted_at IS NULL
                """, (rs, i) -> new BlogProfile(rs.getLong("id"), rs.getString("handle"), rs.getString("nickname"),
                rs.getString("bio"), imageUrls.urlOf(rs.getString("profile_image_key")), rs.getLong("post_count"),
                viewerId != null && viewerId == rs.getLong("id"), null, null, 0, 0, false), handle);
        return rows.stream().findFirst().map(p -> p.withFollow(follows.counts(p.id()),
                viewerId != null && !p.mine() && follows.isFollowing(viewerId, p.id()))).map(p -> {
            if (viewerId == null || p.mine()) return p;
            FriendService.Relation relation = friends.relation(viewerId, p.id());
            BlogProfile withRelation = p.withFriendship(relation.name(), friendQuery.lastActiveDaysAgo(viewerId, p.id()).orElse(null));
            if (relation != FriendService.Relation.FRIENDS) return withRelation;
            Long count = jdbc.queryForObject("SELECT count(*) FROM post p JOIN member m ON m.id = p.author_id WHERE p.author_id = ? AND "
                    + FRIENDS_BLOG_CONDITION, Long.class, p.id());
            return withRelation.withPostCount(count == null ? 0 : count);
        });
    }

    public Optional<Long> ownerId(String handle) {
        return findBlogOwner(handle);
    }

    private Optional<Long> findBlogOwner(String handle) {
        return jdbc.queryForList("SELECT id FROM member WHERE handle = ? AND withdrawn_at IS NULL AND deleted_at IS NULL",
                Long.class, handle).stream().findFirst();
    }

    /**
     * 팔로잉 피드 (016 US2): 내가 팔로우한 사람의 공개 글만, 홈과 같은 정렬·카드·9개 (FR-016·FR-017).
     * 친구 공개 글은 친구여도 넣지 않는다. 팔로우 조건은 요청마다 다시 읽어 언팔로우가 다음 요청부터 반영된다(FR-019).
     */
    public Page following(long memberId, String cursor) {
        return list("feed:" + memberId, null, null, cursor, false, memberId);
    }

    private Page list(String listName, Long authorId, String tag, String cursor, boolean friendsView) {
        return list(listName, authorId, tag, cursor, friendsView, null);
    }

    private Page list(String listName, Long authorId, String tag, String cursor, boolean friendsView, Long followerId) {
        StringBuilder sql = new StringBuilder(CARD_SELECT).append(friendsView ? FRIENDS_BLOG_CONDITION : PostAccessPolicy.PUBLIC_LIST_CONDITION);
        String sortColumn = friendsView ? "p.published_at" : "p.first_public_at";
        List<Object> args = new ArrayList<>();
        if (authorId != null) {
            sql.append(" AND p.author_id = ?");
            args.add(authorId);
        }
        if (followerId != null) {
            sql.append(" AND p.author_id IN (SELECT f.followee_id FROM follow f WHERE f.follower_id = ?)");
            args.add(followerId);
        }
        if (tag != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM post_tag pt JOIN tag t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.name = ?)");
            args.add(tag);
        }
        if (cursor != null && !cursor.isBlank()) {
            long[] k = cursors.decode(cursor, listName, 2);
            sql.append(" AND (").append(sortColumn).append(", p.id) < (?, ?)");
            args.add(Timestamp.from(Times.fromEpochMicros(k[0])));
            args.add(k[1]);
        }
        sql.append(" ORDER BY ").append(sortColumn).append(" DESC, p.id DESC LIMIT ").append(pageSize + 1);
        List<Card> cards = jdbc.query(sql.toString(), this::card, args.toArray());
        CursorCodec.Page<Card> page = CursorCodec.page(cards, pageSize,
                c -> cursors.encode(listName, Times.toEpochMicros(friendsView ? c.publishedAt() : c.firstPublicAt()), c.id()));
        return new Page(page.items(), page.nextCursor(), friendsView);
    }

    private Card card(ResultSet rs, int i) throws SQLException {
        String handle = rs.getString("handle");
        long id = rs.getLong("id");
        return new Card(id, "/@" + handle + "/posts/" + id, rs.getString("title"),
                renderer.excerpt(rs.getString("content_head")), imageUrls.urlOf(rs.getString("thumbnail_key")),
                instant(rs.getTimestamp("first_public_at")), rs.getTimestamp("published_at").toInstant(),
                Visibility.valueOf(rs.getString("visibility")),
                rs.getInt("comment_count"), rs.getInt("like_count"),
                new Author(rs.getLong("author_id"), handle, rs.getString("nickname"),
                        imageUrls.urlOf(rs.getString("profile_image_key"))));
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
