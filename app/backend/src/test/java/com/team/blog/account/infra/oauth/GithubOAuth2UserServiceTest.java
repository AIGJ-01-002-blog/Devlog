package com.team.blog.account.infra.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import com.sun.net.httpserver.HttpServer;

/** spec 038: GitHub 대표·인증 이메일만 쓴다 (docs/07 §5). 가짜 GitHub API로 확인한다. */
class GithubOAuth2UserServiceTest {
    private HttpServer server;
    private volatile int emailsStatus = 200;
    private volatile String emails = "[]";
    private final List<String> authHeaders = new CopyOnWriteArrayList<>();

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/user", ex -> {
            authHeaders.add(ex.getRequestURI().getPath() + " " + ex.getRequestHeaders().getFirst("Authorization"));
            boolean list = ex.getRequestURI().getPath().equals("/user/emails");
            byte[] out = (list ? emails : "{\"id\":583231,\"login\":\"octo\"}").getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(list ? emailsStatus : 200, out.length);
            ex.getResponseBody().write(out);
            ex.close();
        });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private String base() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    private OAuth2User load(String registrationId) {
        ClientRegistration reg = ClientRegistration.withRegistrationId(registrationId)
                .clientId("client").clientSecret("unused")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri(base() + "/authorize").tokenUri(base() + "/token")
                .userInfoUri(base() + "/user").userNameAttributeName("id")
                .build();
        var token = new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "access-1", Instant.now(), Instant.now().plusSeconds(60));
        return new GithubOAuth2UserService(base()).loadUser(new OAuth2UserRequest(reg, token));
    }

    @Test
    void picksThePrimaryVerifiedEmailOnly() {
        emails = """
                [{"email":"other@example.com","primary":false,"verified":true},
                 {"email":"Mona@Example.com","primary":true,"verified":true}]""";
        OAuth2User user = load("github");
        assertThat(user.getName()).isEqualTo("583231");
        assertThat(user.<String>getAttribute(GithubOAuth2UserService.VERIFIED_EMAIL)).isEqualTo("Mona@Example.com");
        assertThat(authHeaders).contains("/user/emails Bearer access-1");
    }

    @Test
    void unverifiedPrimaryGivesNoEmail() {
        emails = "[{\"email\":\"mona@example.com\",\"primary\":true,\"verified\":false}]";
        assertThat(load("github").<String>getAttribute(GithubOAuth2UserService.VERIFIED_EMAIL)).isNull();
    }

    @Test
    void emailListFailureStillLogsIn() {
        emailsStatus = 403;
        OAuth2User user = load("github");
        assertThat(user.getName()).isEqualTo("583231");
        assertThat(user.<String>getAttribute(GithubOAuth2UserService.VERIFIED_EMAIL)).isNull();
    }

    @Test
    void otherProvidersAreLeftAlone() {
        OAuth2User user = load("google");
        assertThat(user.getAttributes()).doesNotContainKey(GithubOAuth2UserService.VERIFIED_EMAIL);
        assertThat(authHeaders).noneMatch(h -> h.startsWith("/user/emails"));
    }
}
