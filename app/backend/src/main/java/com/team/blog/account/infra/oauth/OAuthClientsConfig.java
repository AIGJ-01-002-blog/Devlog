package com.team.blog.account.infra.oauth;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientProperties;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientPropertiesMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.util.StringUtils;

/**
 * 소셜 로그인 앱 등록. GitHub은 application.yml, Google은 GOOGLE_CLIENT_ID에 값이 있을 때만 켠다 (004).
 * 비밀 파일에 Google 값이 빈 채로 있어도 앱이 뜨고, 화면은 /api/auth/providers를 보고 Google 버튼을 숨긴다.
 */
@Configuration
@EnableConfigurationProperties(OAuth2ClientProperties.class)
public class OAuthClientsConfig {
    @Bean
    ClientRegistrationRepository clientRegistrationRepository(OAuth2ClientProperties properties, Environment env) {
        List<ClientRegistration> all = new ArrayList<>(new OAuth2ClientPropertiesMapper(properties).asClientRegistrations().values());
        String googleId = env.getProperty("GOOGLE_CLIENT_ID");
        if (StringUtils.hasText(googleId) && all.stream().noneMatch(r -> r.getRegistrationId().equals("google"))) {
            all.add(CommonOAuth2Provider.GOOGLE.getBuilder("google")
                    .clientId(googleId)
                    .clientSecret(env.getProperty("GOOGLE_CLIENT_SECRET", ""))
                    .scope("openid", "profile", "email")
                    .build());
        }
        return new InMemoryClientRegistrationRepository(all);
    }
}
