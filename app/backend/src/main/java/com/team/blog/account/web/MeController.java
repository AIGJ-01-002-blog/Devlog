package com.team.blog.account.web;

import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.account.application.NicknameService;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

@RestController
@RequestMapping("/api/me")
public class MeController {
    private final NicknameService nicknameService;

    public MeController(NicknameService nicknameService) {
        this.nicknameService = nicknameService;
    }

    public record NicknameRequest(String nickname) {}

    @PatchMapping("/nickname")
    public NicknameService.Result changeNickname(@CurrentMember MemberPrincipal me, @RequestBody NicknameRequest body) {
        return nicknameService.change(me.id(), body.nickname());
    }
}
