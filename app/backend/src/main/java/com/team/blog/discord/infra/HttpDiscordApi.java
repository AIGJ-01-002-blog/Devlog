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
    /** 429일 때 이보다 오래 기다리라면 다시 보내지 않고 버린다 */
    private static final Duration MAX_RETRY_WAIT = Duration.ofSeconds(5);

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
            // wait=true: 디스코드가 메시지를 실제로 저장한 뒤에 답하게 해, 저장 실패를 성공으로 잘못 세지 않는다
            URI target = URI.create(uri(w) + "?wait=true");
            String payload = json.writeValueAsString(body);
            for (int attempt = 1; ; attempt++) {
                HttpRequest req = HttpRequest.newBuilder(target).timeout(TIMEOUT).header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8)).build();
                HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (res.statusCode() / 100 == 2) return Result.OK;
                if (gone(res.statusCode())) return Result.GONE;
                // 429: 디스코드가 알려 준 시간이 짧으면 한 번만 기다렸다 다시 보낸다(보내기 전용 실행기라 블로그 처리는 막지 않음)
                Duration wait = res.statusCode() == 429 && attempt == 1 ? retryAfter(res) : null;
                if (wait != null) {
                    Thread.sleep(wait.toMillis());
                    continue;
                }
                log.warn("디스코드 메시지를 보내지 못했습니다 (HTTP {})", res.statusCode());
                return Result.FAILED;
            }
        } catch (IOException | RuntimeException e) {
            log.warn("디스코드 메시지를 보내지 못했습니다: {}", e.getClass().getSimpleName());
            return Result.FAILED;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Result.FAILED;
        }
    }

    /** 429 응답의 retry_after(초, 소수). MAX_RETRY_WAIT보다 길거나 읽을 수 없으면 null(다시 보내지 않음) */
    private Duration retryAfter(HttpResponse<String> res) {
        double seconds;
        try {
            seconds = json.readTree(res.body()).path("retry_after").asDouble(-1);
        } catch (RuntimeException e) {
            seconds = -1;
        }
        if (seconds < 0) seconds = res.headers().firstValue("Retry-After").map(v -> {
            try { return Double.parseDouble(v); } catch (NumberFormatException e) { return -1d; }
        }).orElse(-1d);
        if (seconds < 0 || seconds > MAX_RETRY_WAIT.toSeconds()) return null;
        return Duration.ofMillis((long) Math.ceil(seconds * 1000));
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
