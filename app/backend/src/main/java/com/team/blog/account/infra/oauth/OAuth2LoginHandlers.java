package com.team.blog.account.infra.oauth;

import java.io.IOException;
import java.util.Objects;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.team.blog.account.application.SocialProfile;
import com.team.blog.account.domain.AuthProvider;
import com.team.blog.account.web.LoginFlow;

/** GitHub OAuth2 성공·실패 처리. 성공하면 우리 로그인 흐름(LoginFlow)으로 넘긴다. */
@Component
public class OAuth2LoginHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler {
    private final LoginFlow loginFlow;

    public OAuth2LoginHandlers(LoginFlow loginFlow) {
        this.loginFlow = loginFlow;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException {
        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        OAuth2User user = Objects.requireNonNull(token.getPrincipal(), "로그인한 사용자 정보가 없습니다");
        SocialProfile profile = switch (token.getAuthorizedClientRegistrationId()) {
            case "github" -> new SocialProfile(AuthProvider.GITHUB,
                    String.valueOf(user.getAttributes().get("id")),
                    str(user.getAttributes().get("login")),
                    str(user.getAttributes().get("name")),
                    str(user.getAttributes().get(GithubOAuth2UserService.VERIFIED_EMAIL)),
                    str(user.getAttributes().get("avatar_url")));
            case "google" -> new SocialProfile(AuthProvider.GOOGLE,
                    str(user.getAttributes().get("sub")),
                    null,
                    str(user.getAttributes().get("name")),
                    Boolean.TRUE.equals(user.getAttributes().get("email_verified")) ? str(user.getAttributes().get("email")) : null,
                    str(user.getAttributes().get("picture")));
            default -> throw new IllegalStateException("지원하지 않는 로그인 수단");
        };
        response.sendRedirect(loginFlow.complete(profile, request, response));
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
            throws IOException {
        response.sendRedirect("/login?error=SOCIAL_LOGIN_FAILED");
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
