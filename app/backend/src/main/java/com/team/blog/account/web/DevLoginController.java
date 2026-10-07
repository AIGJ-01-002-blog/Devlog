package com.team.blog.account.web;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.account.application.SocialProfile;
import com.team.blog.account.domain.AuthProvider;
import com.team.blog.shared.mail.Mail;
import com.team.blog.shared.mail.Mailer;
import com.team.blog.shared.mail.OutboxMailer;
import com.team.blog.shared.web.SafeRedirects;

/**
 * 개발·E2E 전용 로그인. GitHub 앱 키 없이 GitHub 인증 결과를 흉내 내 실제와 같은 가입·로그인 흐름을 탄다.
 * blog.dev-login.enabled=true 일 때만 존재한다 (운영에서는 꺼져 있어 404).
 */
@RestController
@ConditionalOnProperty(name = "blog.dev-login.enabled", havingValue = "true")
public class DevLoginController {
    private final LoginFlow loginFlow;
    private final Mailer mailer;

    public DevLoginController(LoginFlow loginFlow, Mailer mailer) {
        this.loginFlow = loginFlow;
        this.mailer = mailer;
    }

    /** 개발 환경의 보낸 메일함 (004 FR-033): 실제로 보내지 않은 인증·재설정 메일을 확인한다. */
    @GetMapping("/api/dev/mails")
    public List<Mail> mails() {
        return mailer instanceof OutboxMailer outbox ? outbox.recent() : List.of();
    }

    public record DevLoginRequest(String provider, String providerUserId, String login, String name, String email,
                                  String redirect, String avatarUrl) {}

    @PostMapping("/api/dev/login")
    public Map<String, String> login(@RequestBody DevLoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        AuthProvider provider = body.provider() == null ? AuthProvider.GITHUB : AuthProvider.valueOf(body.provider());
        if (body.redirect() != null) {
            request.getSession(true).setAttribute(LoginFlow.REDIRECT_KEY, SafeRedirects.sanitize(body.redirect()));
        }
        String target = loginFlow.complete(new SocialProfile(provider, body.providerUserId(), body.login(), body.name(),
                body.email(), body.avatarUrl()), request, response);
        return Map.of("redirect", target);
    }
}
