package com.team.blog.discord.infra;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import com.team.blog.discord.application.DiscordProperties;

/**
 * 웹훅 API를 직접 부른다(라이브러리 없이 두 가지만). 주소에 토큰이 들어가므로 주소·응답 본문은 로그에 남기지 않는다.
 * 멘션은 모두 끈다(닉네임·제목에 든 @everyone이 채널을 울리지 않게), 링크 미리보기 카드도 끈다.
 */
@Component
class HttpDiscordApi implements DiscordApi {
    private static final Logger log = LoggerFactory.getLogger(HttpDiscordApi.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    /** 디스코드 메시지 최대 길이 */
    static final int MAX_CHARS = 2000;
    /** 메시지 플래그 SUPPRESS_EMBEDS */
    private static final int SUPPRESS_EMBEDS = 1 << 2;

    private final DiscordProperties props;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final JsonMapper json = JsonMapper.builder().build();

    HttpDiscordApi(DiscordProperties props) {
        this.props = props;
    }

    private URI uri(Webhook w) {
        String base = props.baseUrl().endsWith("/") ? props.baseUrl().substring(0, props.baseUrl().length() - 1) : props.baseUrl();
        return URI.create(base + "/api/webhooks/" + w.id() + "/" + w.token());
    }

    @Override
    public Lookup lookup(Webhook w) {
        try {
            HttpRequest req = HttpRequest.newBuilder(uri(w)).timeout(TIMEOUT).GET().build();
            HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (res.statusCode() == 200) {
                JsonNode body = json.readTree(res.body());
                return new Lookup(Result.OK, body.path("name").asString(null));
            }
            if (gone(res.statusCode())) return new Lookup(Result.GONE, null);
            log.warn("디스코드 웹훅을 확인하지 못했습니다 (HTTP {})", res.statusCode());
            return new Lookup(Result.FAILED, null);
        } catch (IOException | RuntimeException e) {
            log.warn("디스코드 웹훅을 확인하지 못했습니다: {}", e.getClass().getSimpleName());
            return new Lookup(Result.FAILED, null);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Lookup(Result.FAILED, null);
        }
    }

    @Override
    public Result send(Webhook w, String text) {
        ObjectNode body = json.createObjectNode();
        body.put("content", clip(text));
        body.put("username", "devlog");
        body.putObject("allowed_mentions").putArray("parse");
        body.put("flags", SUPPRESS_EMBEDS);
        try {
            HttpRequest req = HttpRequest.newBuilder(uri(w)).timeout(TIMEOUT).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body), StandardCharsets.UTF_8)).build();
            HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (res.statusCode() / 100 == 2) return Result.OK;
            if (gone(res.statusCode())) return Result.GONE;
            log.warn("디스코드 메시지를 보내지 못했습니다 (HTTP {})", res.statusCode());
            return Result.FAILED;
        } catch (IOException | RuntimeException e) {
            log.warn("디스코드 메시지를 보내지 못했습니다: {}", e.getClass().getSimpleName());
            return Result.FAILED;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Result.FAILED;
        }
    }

    /** 2,000자를 넘으면 말줄임표까지 2,000자로 자른다. 이모지(서로게이트 쌍)를 반으로 가르지 않는다 */
    static String clip(String text) {
        if (text.length() <= MAX_CHARS) return text;
        int end = MAX_CHARS - 1;
        if (Character.isHighSurrogate(text.charAt(end - 1))) end--;
        return text.substring(0, end) + "…";
    }

    /** 401 잘못된 토큰, 404 지운 웹훅: 다시 보내도 안 된다 */
    private static boolean gone(int status) {
        return status == 401 || status == 404;
    }
}
