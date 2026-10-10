package com.team.blog.discord.application;

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
                                @DefaultValue("https://discord.com") String baseUrl) {}
