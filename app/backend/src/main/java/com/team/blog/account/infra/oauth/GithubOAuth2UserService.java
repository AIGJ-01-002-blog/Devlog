package com.team.blog.account.infra.oauth;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * GitHub 사용자 정보 + 인증된 대표 이메일 (docs/07 §5: user:email 권한으로 primary·verified 이메일만 쓴다).
 */
@Component
public class GithubOAuth2UserService extends DefaultOAuth2UserService {
    public static final String VERIFIED_EMAIL = "blog_verified_email";
    private final RestClient rest = RestClient.builder().baseUrl("https://api.github.com").build();

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) {
        OAuth2User user = super.loadUser(userRequest);
        if (!"github".equals(userRequest.getClientRegistration().getRegistrationId())) return user;
        Map<String, Object> attrs = new HashMap<>(user.getAttributes());
        attrs.put(VERIFIED_EMAIL, primaryVerifiedEmail(userRequest.getAccessToken().getTokenValue()));
        return new DefaultOAuth2User(user.getAuthorities(), attrs, "id");
    }

    private String primaryVerifiedEmail(String token) {
        try {
            List<Map<String, Object>> emails = rest.get().uri("/user/emails")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (emails == null) return null;
            for (Map<String, Object> e : emails) {
                if (Boolean.TRUE.equals(e.get("primary")) && Boolean.TRUE.equals(e.get("verified"))) {
                    Object email = e.get("email");
                    return email == null ? null : email.toString().strip().toLowerCase(java.util.Locale.ROOT);
                }
            }
            return null;
        } catch (RestClientException e) {
            return null;
        }
    }
}
