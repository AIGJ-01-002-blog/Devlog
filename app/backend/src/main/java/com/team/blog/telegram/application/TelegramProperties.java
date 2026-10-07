package com.team.blog.telegram.application;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * 텔레그램 연결 (023). 봇 토큰이 비어 있거나 enabled=false면 기능 전체가 꺼진다(FR-001).
 *
 * @param pollTimeout    업데이트 받기(롱 폴링) 한 번에 기다리는 시간
 * @param poll           업데이트 받기를 이 서버에서 돌릴지. 테스트는 끄고 직접 넣는다
 * @param linkTtl        연결 코드 유효 시간 (FR-002)
 * @param memoDailyLimit 회원당 하루 메모 수 (US3)
 * @param memoMaxChars   메모 최대 글자 수
 * @param audience       누가 연결할 수 있는지. 기본은 관리자만(민서님 전용으로 시작), MEMBERS면 회원 누구나
 */
@ConfigurationProperties("blog.telegram")
public record TelegramProperties(@DefaultValue("true") boolean enabled,
                                 @DefaultValue("") String botToken,
                                 @DefaultValue("https://api.telegram.org") String baseUrl,
                                 @DefaultValue("25s") Duration pollTimeout,
                                 @DefaultValue("true") boolean poll,
                                 @DefaultValue("10m") Duration linkTtl,
                                 @DefaultValue("20") int memoDailyLimit,
                                 @DefaultValue("4000") int memoMaxChars,
                                 @DefaultValue("ADMINS") Audience audience) {

    public enum Audience { ADMINS, MEMBERS }

    public boolean available() {
        return enabled && botToken != null && !botToken.isBlank();
    }

    /** 이 조건을 member 별칭 m에 붙이면 연결할 수 있는 회원만 남는다 */
    public String audienceSql() {
        return audience == Audience.MEMBERS ? "TRUE" : "m.role = 'ADMIN'";
    }

    /** 토큰이 로그·오류 화면에 찍히지 않게 한다 (FR-007). */
    @Override
    public String toString() {
        return "TelegramProperties[enabled=" + enabled + ", configured=" + available() + ", audience=" + audience + "]";
    }
}
