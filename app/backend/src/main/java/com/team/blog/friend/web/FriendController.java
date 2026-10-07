package com.team.blog.friend.web;

import java.time.Duration;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.friend.application.FriendQuery;
import com.team.blog.friend.application.FriendService;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.shared.web.RateLimiter;

/**
 * 친구 API (008). 모두 로그인한 본인 기준이고 상대는 블로그 주소로 고른다. 남의 목록을 볼 방법은 없다 (FR-005).
 * <ul>
 *   <li>PUT /api/me/friends/{handle}: 친구 요청 (상대 요청이 있으면 바로 친구)</li>
 *   <li>POST /api/me/friends/{handle}/accept: 받은 요청 수락</li>
 *   <li>DELETE /api/me/friends/{handle}: 거절·요청 취소·친구 끊기 (상대에게 알리지 않음)</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/me/friends")
public class FriendController {
    private final FriendService friends;
    private final FriendQuery query;
    private final RateLimiter rateLimiter;

    public FriendController(FriendService friends, FriendQuery query, RateLimiter rateLimiter) {
        this.friends = friends;
        this.query = query;
        this.rateLimiter = rateLimiter;
    }

    @GetMapping
    public ResponseEntity<FriendQuery.Overview> overview(@CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(query.overview(me.id()));
    }

    @PutMapping("/{handle}")
    public Map<String, String> request(@CurrentMember MemberPrincipal me, @PathVariable String handle) {
        // 요청 폭탄 방지: 하루 100번 (새 관계가 생기지 않는 반복 요청도 센다)
        rateLimiter.check("friend-request:" + me.id(), 100, Duration.ofDays(1));
        return Map.of("relation", friends.request(me.id(), handle).name());
    }

    @PostMapping("/{handle}/accept")
    public Map<String, String> accept(@CurrentMember MemberPrincipal me, @PathVariable String handle) {
        return Map.of("relation", friends.accept(me.id(), handle).name());
    }

    @DeleteMapping("/{handle}")
    public ResponseEntity<Void> remove(@CurrentMember MemberPrincipal me, @PathVariable String handle) {
        friends.remove(me.id(), handle);
        return ResponseEntity.noContent().build();
    }
}
