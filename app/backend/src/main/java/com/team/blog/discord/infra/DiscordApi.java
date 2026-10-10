package com.team.blog.discord.infra;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 디스코드 웹훅 (078). 주소 대신 번호·토큰만 주고받아, 부르는 곳은 항상 설정한 디스코드 주소다. */
public interface DiscordApi {
    /** 디스코드 앱의 [웹후크 URL 복사]로 받는 주소. ptb·canary·옛 discordapp.com과 API 버전이 붙은 꼴도 받는다 */
    Pattern URL = Pattern.compile(
            "^https://(?:(?:ptb|canary)\\.)?discord(?:app)?\\.com/api(?:/v\\d{1,2})?/webhooks/(\\d{15,25})/([A-Za-z0-9_-]{20,128})/?$");

    record Webhook(String id, String token) {
        /** 토큰이 로그·오류 화면에 찍히지 않게 한다 */
        @Override
        public String toString() {
            return "Webhook[id=" + id + "]";
        }
    }

    enum Result { OK, GONE, FAILED }

    /** @param name 디스코드에서 정한 웹훅 이름(없을 수 있음) */
    record Lookup(Result result, String name) {}

    static Optional<Webhook> parse(String url) {
        if (url == null) return Optional.empty();
        Matcher m = URL.matcher(url.strip());
        return m.matches() ? Optional.of(new Webhook(m.group(1), m.group(2))) : Optional.empty();
    }

    /** 웹훅이 살아 있는지 본다 (메시지는 보내지 않는다) */
    Lookup lookup(Webhook webhook);

    Result send(Webhook webhook, String text);
}
