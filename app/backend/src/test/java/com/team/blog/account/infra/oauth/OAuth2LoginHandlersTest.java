package com.team.blog.account.infra.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import com.team.blog.account.application.SocialProfile;
import com.team.blog.account.domain.AuthProvider;
import com.team.blog.account.web.LoginFlow;

/** spec 038: 소셜 인증 결과를 프로필로 옮기기. 이메일 정리는 SocialProfile 한 곳에서 한다. */
class OAuth2LoginHandlersTest {
    final LoginFlow flow = mock(LoginFlow.class);
    final OAuth2LoginHandlers handlers = new OAuth2LoginHandlers(flow);

    SocialProfile succeed(String registrationId, String nameKey, Map<String, Object> attrs) throws Exception {
        when(flow.complete(any(), any(), any())).thenReturn("/next");
        var token = new OAuth2AuthenticationToken(new DefaultOAuth2User(List.of(), attrs, nameKey), List.of(), registrationId);
        MockHttpServletResponse res = new MockHttpServletResponse();
        handlers.onAuthenticationSuccess(new MockHttpServletRequest(), res, token);
        assertThat(res.getRedirectedUrl()).isEqualTo("/next");
        ArgumentCaptor<SocialProfile> profile = ArgumentCaptor.forClass(SocialProfile.class);
        verify(flow).complete(profile.capture(), any(), any());
        return profile.getValue();
    }

    @Test
    void githubProfileUsesNumericIdAndVerifiedEmail() throws Exception {
        SocialProfile p = succeed("github", "id", Map.of("id", 583231, "login", "Octo", "name", "Mona",
                GithubOAuth2UserService.VERIFIED_EMAIL, " Mona@Example.COM ", "avatar_url", "https://avatars.githubusercontent.com/u/1"));
        assertThat(p).isEqualTo(new SocialProfile(AuthProvider.GITHUB, "583231", "Octo", "Mona", "mona@example.com",
                "https://avatars.githubusercontent.com/u/1"));
    }

    @Test
    void googleEmailCountsOnlyWhenVerified() throws Exception {
        Map<String, Object> attrs = new HashMap<>(Map.of("sub", "g-1", "name", "민서", "email", " MinSeo@Gmail.com",
                "email_verified", true, "picture", "https://lh3.googleusercontent.com/a"));
        assertThat(succeed("google", "sub", attrs).verifiedEmail()).isEqualTo("minseo@gmail.com");
    }

    @Test
    void googleUnverifiedOrMissingEmailIsNull() throws Exception {
        assertThat(succeed("google", "sub", Map.of("sub", "g-2", "email", "a@b.com", "email_verified", false)).verifiedEmail()).isNull();
    }

    @Test
    void googleVerifiedWithoutEmailDoesNotFail() throws Exception {
        // 예전에는 email 없이 email_verified만 오면 NPE로 로그인 전체가 500이었다
        assertThat(succeed("google", "sub", Map.of("sub", "g-3", "email_verified", true)).verifiedEmail()).isNull();
    }

    @Test
    void failureGoesBackToLoginWithCode() throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        handlers.onAuthenticationFailure(new MockHttpServletRequest(), res, new BadCredentialsException("x"));
        assertThat(res.getRedirectedUrl()).isEqualTo("/login?error=SOCIAL_LOGIN_FAILED");
    }
}
