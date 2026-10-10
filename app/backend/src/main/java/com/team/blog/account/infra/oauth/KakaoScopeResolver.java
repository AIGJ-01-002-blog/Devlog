package com.team.blog.account.infra.oauth;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.stereotype.Component;

/**
 * 소셜 로그인 인가 요청 (spec 080). Spring은 scope를 공백으로 잇지만 카카오 문서는 쉼표로 잇는다.
 * 카카오 요청만 쉼표로 바꾸고 나머지(GitHub·Google)는 기본 그대로 둔다.
 */
@Component
public class KakaoScopeResolver implements OAuth2AuthorizationRequestResolver {
    private final DefaultOAuth2AuthorizationRequestResolver delegate;

    public KakaoScopeResolver(ClientRegistrationRepository clients) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(clients,
                OAuth2AuthorizationRequestRedirectFilter.DEFAULT_AUTHORIZATION_REQUEST_BASE_URI);
        this.delegate.setAuthorizationRequestCustomizer(b -> b.attributes(attrs -> {
            if (!"kakao".equals(attrs.get(OAuth2ParameterNames.REGISTRATION_ID))) return;
            b.parameters(p -> commaScopes(p));
        }));
    }

    private static void commaScopes(Map<String, Object> params) {
        Object scope = params.get(OAuth2ParameterNames.SCOPE);
        if (scope instanceof String s) params.put(OAuth2ParameterNames.SCOPE, s.replace(' ', ','));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return delegate.resolve(request);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return delegate.resolve(request, clientRegistrationId);
    }
}
