package com.team.blog.discord.application;

import java.net.URI;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * 디스코드 웹훅 알림 (078). 서버 쪽 키는 없다: 회원이 자기 채널의 웹훅 주소를 넣는다.
 *
 * @param enabled false면 설정 화면에서 숨기고 보내지 않는다
 * @param baseUrl 웹훅을 부를 디스코드 주소. 회원이 넣은 주소의 호스트는 쓰지 않는다(다른 곳으로 요청이 나가지 않게). 테스트만 바꾼다
 */
@ConfigurationProperties("blog.discord")
public record DiscordProperties(@DefaultValue("true") boolean enabled,
                                @DefaultValue("https://discord.com") String baseUrl) {

    /** 웹훅 토큰이 엉뚱한 곳으로 가지 않게: discord.com(https)만, 테스트의 가짜 서버(127.0.0.1)만 예외 */
    public DiscordProperties {
        URI u = URI.create(baseUrl);
        boolean discord = "https".equals(u.getScheme()) && "discord.com".equals(u.getHost());
        boolean loopback = "http".equals(u.getScheme()) && "127.0.0.1".equals(u.getHost());
        if (!discord && !loopback) throw new IllegalArgumentException("blog.discord.base-url은 https://discord.com만 쓸 수 있습니다");
    }
}
