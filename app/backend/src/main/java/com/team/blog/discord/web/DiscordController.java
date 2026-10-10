package com.team.blog.discord.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.discord.application.DiscordLinks;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/** 설정 화면의 디스코드 항목 (078). */
@RestController
@RequestMapping("/api/me/discord")
public class DiscordController {
    private final DiscordLinks links;

    public DiscordController(DiscordLinks links) {
        this.links = links;
    }

    public record ConnectRequest(String url) {}

    public record NotifyRequest(Boolean notifications) {}

    @GetMapping
    public ResponseEntity<DiscordLinks.Status> status(@CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(links.status(me.id()));
    }

    /** 웹훅 주소로 연결하거나 바꾼다 */
    @PutMapping
    public DiscordLinks.Status connect(@CurrentMember MemberPrincipal me, @RequestBody ConnectRequest body) {
        if (body == null || body.url() == null || body.url().isBlank()) throw ApiException.badRequest("INVALID_REQUEST", "웹훅 주소를 넣어 주세요.");
        return links.connect(me.id(), body.url());
    }

    @PostMapping("/test")
    public DiscordLinks.Status test(@CurrentMember MemberPrincipal me) {
        return links.test(me.id());
    }

    @PatchMapping
    public DiscordLinks.Status update(@CurrentMember MemberPrincipal me, @RequestBody NotifyRequest body) {
        if (body == null || body.notifications() == null) throw ApiException.badRequest("INVALID_REQUEST", "설정 값을 확인해 주세요.");
        return links.setNotify(me.id(), body.notifications());
    }

    @DeleteMapping
    public ResponseEntity<Void> unlink(@CurrentMember MemberPrincipal me) {
        links.unlink(me.id());
        return ResponseEntity.noContent().build();
    }
}
