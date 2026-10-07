package com.team.blog.like.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.access.ReadablePost;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.domain.PostStatus;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.time.Times;
import com.team.blog.shared.web.RateLimiter;
import com.team.blog.shared.web.TooManyRequestsException;

/**
 * 글 좋아요 (spec 012, docs/30). 뒤집기가 아니라 상태 지정이라 같은 요청을 몇 번 보내도 결과가 같다.
 * 검사 순서는 로그인(컨트롤러) → 계정 상태(AccountStateFilter) → 글을 볼 수 있나(404) → 자기 글(403) → 요청 횟수(429) → 처리 (docs/42 §3).
 * 좋아요 수는 저장하지 않고 post_like 행을 센다(V3, post_stat). 그래서 수와 실제가 어긋날 수 없고 보정 작업도 필요 없다.
 */
@Service
public class LikeService {
    static final int PER_MINUTE = 60;

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final PostAccessPolicy policy;
    private final RateLimiter rateLimiter;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public LikeService(JdbcTemplate jdbc, TransactionTemplate tx, PostAccessPolicy policy, RateLimiter rateLimiter,
                       ApplicationEventPublisher events, Clock clock) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.policy = policy;
        this.rateLimiter = rateLimiter;
        this.events = events;
        this.clock = clock;
    }

    public record LikeState(boolean liked, int likeCount) {}

    public LikeState set(long memberId, long postId, boolean liked) {
        long authorId = checkTarget(memberId, postId);
        if (!rateLimiter.tryAcquire("like:" + memberId, PER_MINUTE, Duration.ofMinutes(1))) {
            throw new TooManyRequestsException(60, "RATE_LIMITED", "잠시 후 다시 시도해 주세요.");
        }
        Instant now = Times.now(clock);
        tx.executeWithoutResult(s -> {
            // 문장 하나로 생기거나 지워진 경우만 사건을 낸다. 사건은 리스너가 커밋 뒤에 받는다
            int changed = liked
                    ? jdbc.update("INSERT INTO post_like (post_id, member_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                            postId, memberId, Timestamp.from(now))
                    : jdbc.update("DELETE FROM post_like WHERE post_id = ? AND member_id = ?", postId, memberId);
            if (changed == 1) {
                events.publishEvent(liked ? new LikeEvents.PostLiked(postId, authorId, memberId, now)
                        : new LikeEvents.PostUnliked(postId, authorId, memberId, now));
            }
        });
        return state(memberId, postId);
    }

    /** 최신 수는 그 사이 다른 사람이 누른 것까지 반영한다 (FR-008). */
    public LikeState state(long memberId, long postId) {
        return jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM post_like WHERE post_id = ? AND member_id = ?) AS liked,
                       (SELECT count(*) FROM post_like WHERE post_id = ?) AS like_count
                """, (rs, i) -> new LikeState(rs.getBoolean("liked"), rs.getInt("like_count")), postId, memberId, postId);
    }

    /** @return 글 작성자 번호. 볼 수 없는 글은 404, 자기 글은 403 */
    private long checkTarget(long memberId, long postId) {
        List<ReadablePost> rows = jdbc.query("""
                SELECT p.author_id, p.status, p.visibility, p.deleted_at IS NOT NULL AS deleted, p.hidden_at IS NOT NULL AS hidden,
                       m.withdrawn_at IS NOT NULL AS withdrawn
                FROM post p JOIN member m ON m.id = p.author_id WHERE p.id = ?
                """, (rs, i) -> new ReadablePost(rs.getLong("author_id"), PostStatus.valueOf(rs.getString("status")),
                Visibility.valueOf(rs.getString("visibility")), rs.getBoolean("deleted"), rs.getBoolean("hidden"),
                rs.getBoolean("withdrawn")), postId);
        if (rows.isEmpty()) throw new NotFoundException();
        ReadablePost post = rows.get(0);
        // 작성자 본인은 임시·숨김 글도 "볼 수 있음"이라, 발행 글인지 따로 본다
        if (post.status() != PostStatus.PUBLISHED || post.hidden() || !policy.canRead(post, new Viewer(memberId, false))) {
            throw new NotFoundException();
        }
        if (post.authorId() == memberId) {
            throw new ApiException(HttpStatus.FORBIDDEN, "CANNOT_LIKE_OWN_POST", "내 글에는 좋아요를 누를 수 없어요.");
        }
        return post.authorId();
    }
}
