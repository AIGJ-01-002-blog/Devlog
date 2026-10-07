package com.team.blog.account.web;

import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.account.application.SocialLinks;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/** 블로그 소셜 정보 저장 (spec 043). 읽기는 블로그 프로필(/api/members/{handle})과 설정(/api/me/settings)에 함께 온다. */
@RestController
public class SocialLinksController {
    private final SocialLinks links;

    public SocialLinksController(SocialLinks links) {
        this.links = links;
    }

    /** 다섯 칸을 한 번에 저장한다. 빈 칸이나 보내지 않은 칸은 지운다. 정리한 값을 돌려준다. */
    @PutMapping("/api/me/social-links")
    public SocialLinks.Links save(@CurrentMember MemberPrincipal me, @RequestBody SocialLinks.Links body) {
        if (body == null) throw ApiException.badRequest("INVALID_REQUEST", "소셜 정보를 확인해 주세요.");
        return links.save(me.id(), body);
    }
}
