package com.team.blog.account.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.account.application.MemberAbout;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/** 블로그 [소개] 탭 (spec 042). 읽기는 누구나, 고치기는 본인만. */
@RestController
public class AboutController {
    private final MemberAbout about;

    public AboutController(MemberAbout about) {
        this.about = about;
    }

    /** 본인이면 원문이 함께 와서 보는 사람마다 다르다. 공유 캐시에 넣지 않는다. */
    @GetMapping("/api/members/{handle}/about")
    public ResponseEntity<MemberAbout.About> read(@PathVariable String handle, @CurrentMember(required = false) MemberPrincipal me) {
        MemberAbout.About a = about.of(handle, me == null ? null : me.id()).orElseThrow(NotFoundException::new);
        return ResponseEntity.ok().cacheControl(CacheControl.noCache().cachePrivate()).body(a);
    }

    public record SaveRequest(String contentMd) {}

    @PutMapping("/api/me/about")
    public ResponseEntity<Void> save(@CurrentMember MemberPrincipal me, @RequestBody SaveRequest body) {
        if (body == null) throw ApiException.badRequest("INVALID_REQUEST", "소개를 확인해 주세요.");
        about.save(me.id(), body.contentMd());
        return ResponseEntity.noContent().build();
    }
}
