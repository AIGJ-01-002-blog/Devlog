package com.team.blog.account.web;

import java.time.Duration;
import java.util.Locale;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.account.application.HandlePolicy;
import com.team.blog.account.application.HandleSuggester;
import com.team.blog.account.application.NicknamePolicy;
import com.team.blog.account.infra.MemberRepository;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.shared.web.ClientIpResolver;
import com.team.blog.shared.web.RateLimiter;

/** 블로그 주소·닉네임 중복 확인 (docs/08 §4-2, docs/09 §6). 같은 IP 1분에 30번. 화면 확인은 참고용이다. */
@RestController
public class AvailabilityController {
    private final HandlePolicy handlePolicy;
    private final HandleSuggester suggester;
    private final NicknamePolicy nicknamePolicy;
    private final MemberRepository members;
    private final RateLimiter rateLimiter;
    private final ClientIpResolver ipResolver;
    private final int perMinute;

    public AvailabilityController(HandlePolicy handlePolicy, HandleSuggester suggester, NicknamePolicy nicknamePolicy,
                                  MemberRepository members, RateLimiter rateLimiter, ClientIpResolver ipResolver,
                                  BlogProperties props) {
        this.handlePolicy = handlePolicy;
        this.suggester = suggester;
        this.nicknamePolicy = nicknamePolicy;
        this.members = members;
        this.rateLimiter = rateLimiter;
        this.ipResolver = ipResolver;
        this.perMinute = props.auth().availabilityRateLimitPerMinute();
    }

    public record HandleAvailability(boolean available, String reason, String message, String suggestion) {}

    @GetMapping("/api/handles/availability")
    public HandleAvailability handle(@RequestParam String handle, HttpServletRequest request) {
        rateLimiter.check("avail:ip:" + ipResolver.resolve(request), perMinute, Duration.ofMinutes(1));
        String h = handle.strip().toLowerCase(Locale.ROOT);
        HandlePolicy.Reason reason = handlePolicy.checkFull(h);
        if (reason == null && members.existsByHandle(h)) reason = HandlePolicy.Reason.TAKEN;
        if (reason == null) return new HandleAvailability(true, null, null, null);
        String suggestion = null;
        if (reason == HandlePolicy.Reason.TAKEN || reason == HandlePolicy.Reason.RESERVED) {
            suggestion = HandlePolicy.bodyOf(suggester.firstFree(HandlePolicy.providerOf(h), HandlePolicy.bodyOf(h)));
        }
        return new HandleAvailability(false, reason.name(), reason.message(), suggestion);
    }

    public record HandleSuggestion(String handleBody) {}

    /**
     * 가입 화면의 주소 미리 채우기 (docs/08 §3, 004 FR-011). 재료는 이메일 @ 앞부분(이메일 가입) 또는 이름이다.
     * 비어 있는 첫 번호까지 붙여 돌려준다.
     */
    @GetMapping("/api/handles/suggestion")
    public HandleSuggestion suggest(@RequestParam String material,
                                    @RequestParam(defaultValue = "LOCAL") com.team.blog.account.domain.AuthProvider provider,
                                    HttpServletRequest request) {
        rateLimiter.check("avail:ip:" + ipResolver.resolve(request), perMinute, Duration.ofMinutes(1));
        String m = material.length() > 254 ? material.substring(0, 254) : material;
        return new HandleSuggestion(HandlePolicy.bodyOf(suggester.suggest(provider, m)));
    }

    public record NicknameAvailability(boolean available, String code, String message) {}

    @GetMapping("/api/nicknames/availability")
    public NicknameAvailability nickname(@RequestParam String nickname, HttpServletRequest request,
                                         @CurrentMember(required = false) MemberPrincipal principal) {
        rateLimiter.check("avail:ip:" + ipResolver.resolve(request), perMinute, Duration.ofMinutes(1));
        NicknamePolicy.Code code = nicknamePolicy.check(NicknamePolicy.normalize(nickname), principal == null ? -1 : principal.id());
        return code == null ? new NicknameAvailability(true, null, null) : new NicknameAvailability(false, code.name(), code.message());
    }
}
