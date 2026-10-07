package com.team.blog.telegram.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.telegram.application.TelegramLinks;

/** 설정 화면의 텔레그램 항목 (023 US1·US2). */
@RestController
@RequestMapping("/api/me/telegram")
public class TelegramController {
    private final TelegramLinks links;

    public TelegramController(TelegramLinks links) {
        this.links = links;
    }

    public record NotifyRequest(Boolean notifications) {}

    @GetMapping
    public ResponseEntity<TelegramLinks.Status> status(@CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(links.status(me.id()));
    }

    /** 1회용 연결 주소 (10분) */
    @PostMapping("/link")
    public ResponseEntity<TelegramLinks.Link> link(@CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(links.issue(me.id()));
    }

    @PatchMapping
    public TelegramLinks.Status update(@CurrentMember MemberPrincipal me, @RequestBody NotifyRequest body) {
        if (body == null || body.notifications() == null) throw ApiException.badRequest("INVALID_REQUEST", "설정 값을 확인해 주세요.");
        return links.setNotify(me.id(), body.notifications());
    }

    @DeleteMapping
    public ResponseEntity<Void> unlink(@CurrentMember MemberPrincipal me) {
        links.unlink(me.id());
        return ResponseEntity.noContent().build();
    }
}
