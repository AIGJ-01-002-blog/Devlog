package com.team.blog.discovery.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.discovery.application.FeedQuery;
import com.team.blog.discovery.application.PostDetailQuery;
import com.team.blog.post.access.Viewer;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.tag.application.TagNormalizer;

/** 읽기 API: 홈 목록, 개인 블로그, 글 상세 (docs/10 §4-2, docs/40). size 파라미터는 받지 않는다(9개 고정). */
@RestController
public class DiscoveryController {
    private final FeedQuery feed;
    private final PostDetailQuery details;

    public DiscoveryController(FeedQuery feed, PostDetailQuery details) {
        this.feed = feed;
        this.details = details;
    }

    @GetMapping("/api/posts")
    public ResponseEntity<FeedQuery.Page> home(@RequestParam(required = false) String cursor) {
        return ResponseEntity.ok().cacheControl(CacheControl.noCache()).body(feed.home(cursor));
    }

    @GetMapping("/api/members/{handle}")
    public ResponseEntity<FeedQuery.BlogProfile> profile(@PathVariable String handle,
                                                         @CurrentMember(required = false) MemberPrincipal me) {
        FeedQuery.BlogProfile p = feed.profile(handle, me == null ? null : me.id()).orElseThrow(NotFoundException::new);
        return ResponseEntity.ok().cacheControl(CacheControl.noCache().cachePrivate()).body(p);
    }

    @GetMapping("/api/members/{handle}/posts")
    public ResponseEntity<FeedQuery.Page> blog(@PathVariable String handle, @RequestParam(required = false) String cursor,
                                               @RequestParam(required = false) String tag) {
        // 블로그 안 태그 필터 (010 FR-031). 형식에 맞지 않는 태그는 404
        String name = tag == null || tag.isEmpty() ? null : TagNormalizer.canonical(tag).orElseThrow(NotFoundException::new);
        return ResponseEntity.ok().cacheControl(CacheControl.noCache()).body(feed.blog(handle, name, cursor));
    }

    /** 상세는 보는 사람마다 달라 공유 캐시에 넣지 않고, 공개가 아닌 글은 어디에도 저장하지 않는다 (docs/40 R-9). */
    @GetMapping("/api/posts/{postId}")
    public ResponseEntity<PostDetailQuery.Detail> detail(@PathVariable String postId,
                                                        @CurrentMember(required = false) MemberPrincipal me) {
        long id = parseId(postId);
        PostDetailQuery.Detail d = details.find(id, Viewer.of(me)).orElseThrow(NotFoundException::new);
        CacheControl cc = d.publiclyVisible() ? CacheControl.noCache().cachePrivate() : CacheControl.noStore().cachePrivate();
        return ResponseEntity.ok().cacheControl(cc).body(d);
    }

    static long parseId(String raw) {
        if (raw == null || !raw.matches("[1-9][0-9]{0,17}")) throw new NotFoundException();
        return Long.parseLong(raw);
    }
}
