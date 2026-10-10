package com.team.blog.follow.web;

import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.discovery.application.FeedQuery;
import com.team.blog.follow.application.FollowQuery;
import com.team.blog.follow.application.FollowService;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.post.query.PostCardPage;
import com.team.blog.post.query.PostCard;

/**
 * 팔로우 API (016).
 * <ul>
 *   <li>PUT·DELETE /api/members/{handle}/follow: 팔로우·언팔로우 (상태 지정, 여러 번 보내도 같음). 이메일 인증 전에도 된다(FR-002)</li>
 *   <li>GET /api/members/{handle}/followers, /following: 누구나 (FR-010). 주인이 비공개로 두면 본인·관리자만 (079)</li>
 *   <li>GET /api/feed: 팔로잉 피드, 로그인 필요 (FR-015)</li>
 * </ul>
 */
@RestController
public class FollowController {
    private final FollowService follows;
    private final FollowQuery query;
    private final FeedQuery feed;

    public FollowController(FollowService follows, FollowQuery query, FeedQuery feed) {
        this.follows = follows;
        this.query = query;
        this.feed = feed;
    }

    @PutMapping("/api/members/{handle}/follow")
    public ResponseEntity<FollowService.State> follow(@PathVariable String handle, @CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(follows.set(me.id(), handle, true));
    }

    @DeleteMapping("/api/members/{handle}/follow")
    public ResponseEntity<FollowService.State> unfollow(@PathVariable String handle, @CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(follows.set(me.id(), handle, false));
    }

    /** 보는 사람마다 팔로우 버튼 상태가 다르고 비공개 목록은 본인·관리자만 보므로(079) 저장하지 않는다. */
    @GetMapping("/api/members/{handle}/followers")
    public ResponseEntity<FollowQuery.Page> followers(@PathVariable String handle, @RequestParam(required = false) String cursor,
                                                      @CurrentMember(required = false) MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
                .body(query.list(handle, FollowQuery.Direction.FOLLOWERS, cursor, me == null ? null : me.id(), me != null && me.isStaff()));
    }

    @GetMapping("/api/members/{handle}/following")
    public ResponseEntity<FollowQuery.Page> following(@PathVariable String handle, @RequestParam(required = false) String cursor,
                                                      @CurrentMember(required = false) MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
                .body(query.list(handle, FollowQuery.Direction.FOLLOWING, cursor, me == null ? null : me.id(), me != null && me.isStaff()));
    }

    /** @param followsAnyone 빈 피드 문구를 고르는 데 쓴다 (FR-020). 첫 쪽에서만 센다 */
    public record FeedPage(List<PostCard> items, String nextCursor, Boolean followsAnyone) {}

    @GetMapping("/api/feed")
    public ResponseEntity<FeedPage> feed(@RequestParam(required = false) String cursor, @CurrentMember MemberPrincipal me) {
        PostCardPage page = feed.following(me.id(), cursor);
        Boolean any = cursor == null || cursor.isEmpty() ? query.counts(me.id()).following() > 0 : null;
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new FeedPage(page.items(), page.nextCursor(), any));
    }
}
