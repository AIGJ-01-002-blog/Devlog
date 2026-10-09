package com.team.blog.account.infra.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientProperties;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

import java.util.Map;

/** 프록시 뒤에서도 GitHub·Google 콜백 주소가 사이트 주소(https)로 나가야 한다. 요청의 http를 따라가면 GitHub이 거절한다. */
class OAuthClientsConfigTest {

    ClientRegistrationRepository repository(Map<String, Object> overrides) throws Exception {
        StandardEnvironment env = new StandardEnvironment();
        env.getPropertySources().addFirst(new MapPropertySource("test", overrides));
        new YamlPropertySourceLoader().load("application", new ClassPathResource("application.yml"))
                .forEach(env.getPropertySources()::addLast);
        OAuth2ClientProperties props = Binder.get(env).bind("spring.security.oauth2.client", OAuth2ClientProperties.class).get();
        return new OAuthClientsConfig().clientRegistrationRepository(props, env);
    }

    @Test
    void githubCallbackUsesSiteBaseUrl() throws Exception {
        var repo = repository(Map.of("SITE_BASE_URL", "https://devlog.life"));
        assertThat(repo.findByRegistrationId("github").getRedirectUri())
                .isEqualTo("https://devlog.life/login/oauth2/code/{registrationId}");
    }

    @Test
    void googleCallbackUsesSiteBaseUrlWithoutDoubleSlash() throws Exception {
        var repo = repository(Map.of("SITE_BASE_URL", "https://devlog.life/", "GOOGLE_CLIENT_ID", "g-id"));
        assertThat(repo.findByRegistrationId("google").getRedirectUri())
                .isEqualTo("https://devlog.life/login/oauth2/code/{registrationId}");
    }
}
