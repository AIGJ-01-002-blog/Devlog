package com.team.blog.discord.application;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.discord.infra.DiscordApi;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.web.RateLimiter;

/**
 * 회원 ↔ 디스코드 웹훅 연결 (078). 회원이 자기 채널의 웹훅 주소를 넣으면 디스코드에 살아 있는지 물어본 뒤 저장한다.
 * 토큰은 화면에 돌려주지 않는다. 회원 하나에 웹훅 하나이고, 다시 넣으면 바꾼다.
 */
@Service
@EnableConfigurationProperties(DiscordProperties.class)
public class DiscordLinks {
    /** 연결·시험 보내기를 합쳐 회원당 이 횟수까지 (남의 채널로 메시지를 퍼붓는 데 쓰이지 않게) */
    static final int ACTION_LIMIT = 10;
    static final Duration ACTION_WINDOW = Duration.ofHours(1);

    static final String WELCOME = "✅ devlog 알림을 이 채널로 보내 드릴게요. 끄거나 끊으려면 devlog 설정 › 알림 › 디스코드로 가세요.";
    static final String TEST = "🔔 devlog 시험 알림이에요. 이 메시지가 보이면 잘 연결된 거예요.";

    private final DiscordProperties props;
    private final DiscordApi api;
    private final JdbcTemplate jdbc;
    private final RateLimiter limiter;

    public DiscordLinks(DiscordProperties props, DiscordApi api, JdbcTemplate jdbc, RateLimiter limiter) {
        this.props = props;
        this.api = api;
        this.jdbc = jdbc;
        this.limiter = limiter;
    }

    /** @param webhookName 디스코드에서 정한 웹훅 이름. 화면이 "어디로 가는지" 보여 줄 때 쓴다 */
    public record Status(boolean available, boolean linked, String webhookName, boolean notifications, Instant linkedAt) {}

    record Target(DiscordApi.Webhook webhook, boolean notifications) {}

    public Status status(long memberId) {
        List<Status> rows = jdbc.query("SELECT channel_name, notify, linked_at FROM member_discord WHERE member_id = ?",
                (rs, i) -> new Status(props.enabled(), true, rs.getString(1), rs.getBoolean(2), rs.getTimestamp(3).toInstant()), memberId);
        return rows.isEmpty() ? new Status(props.enabled(), false, null, false, null) : rows.getFirst();
    }

    /** 웹훅 주소를 확인해 연결하고(이미 있으면 바꾸고) 그 채널에 첫 메시지를 보낸다 */
    public Status connect(long memberId, String url) {
        requireEnabled();
        DiscordApi.Webhook w = DiscordApi.parse(url).orElseThrow(() -> ApiException.badRequest("DISCORD_INVALID_URL",
                "디스코드 웹훅 주소가 아니에요. 채널 설정 › 연동 › 웹후크에서 [웹후크 URL 복사]로 받은 주소를 넣어 주세요."));
        limiter.check("discord:" + memberId, ACTION_LIMIT, ACTION_WINDOW);
        DiscordApi.Lookup found = api.lookup(w);
        if (found.result() == DiscordApi.Result.GONE) {
            throw ApiException.badRequest("DISCORD_WEBHOOK_NOT_FOUND", "디스코드에 없는 웹훅이에요. 지워졌는지 확인하고 주소를 다시 복사해 주세요.");
        }
        if (found.result() != DiscordApi.Result.OK) unavailable();
        String name = found.name() == null ? null : found.name().strip();
        if (name != null && name.length() > 100) name = name.substring(0, 100);
        jdbc.update("""
                INSERT INTO member_discord (member_id, webhook_id, webhook_token, channel_name) VALUES (?, ?, ?, ?)
                ON CONFLICT (member_id) DO UPDATE SET webhook_id = EXCLUDED.webhook_id, webhook_token = EXCLUDED.webhook_token,
                    channel_name = EXCLUDED.channel_name, notify = true, linked_at = CURRENT_TIMESTAMP
                """, memberId, w.id(), w.token(), name);
        api.send(w, WELCOME);
        return status(memberId);
    }

    /** 연결된 채널에 시험 메시지를 보낸다. 웹훅이 지워졌으면 연결을 지우고 알려 준다 */
    public Status test(long memberId) {
        requireEnabled();
        Target t = target(memberId).orElseThrow(DiscordLinks::notLinked);
        limiter.check("discord:" + memberId, ACTION_LIMIT, ACTION_WINDOW);
        DiscordApi.Result r = api.send(t.webhook(), TEST);
        if (r == DiscordApi.Result.GONE) {
            forget(memberId, t.webhook());
            throw ApiException.conflict("DISCORD_WEBHOOK_GONE", "디스코드에서 웹훅이 지워져 연결을 끊었어요. 새 주소로 다시 연결해 주세요.");
        }
        if (r != DiscordApi.Result.OK) unavailable();
        return status(memberId);
    }

    public Status setNotify(long memberId, boolean notify) {
        if (jdbc.update("UPDATE member_discord SET notify = ? WHERE member_id = ?", notify, memberId) == 0) throw notLinked();
        return status(memberId);
    }

    public boolean unlink(long memberId) {
        return jdbc.update("DELETE FROM member_discord WHERE member_id = ?", memberId) > 0;
    }

    /** 보내 보니 웹훅이 지워졌을 때. 그 사이 새 웹훅으로 바꿨으면 그대로 둔다 */
    void forget(long memberId, DiscordApi.Webhook gone) {
        jdbc.update("DELETE FROM member_discord WHERE member_id = ? AND webhook_id = ?", memberId, gone.id());
    }

    Optional<Target> target(long memberId) {
        return jdbc.query("""
                        SELECT d.webhook_id, d.webhook_token, d.notify FROM member_discord d JOIN member m ON m.id = d.member_id
                        WHERE d.member_id = ? AND m.status <> 'WITHDRAWN' AND m.deleted_at IS NULL
                        """,
                (rs, i) -> new Target(new DiscordApi.Webhook(rs.getString(1), rs.getString(2)), rs.getBoolean(3)), memberId)
                .stream().findFirst();
    }

    boolean enabled() {
        return props.enabled();
    }

    private void requireEnabled() {
        if (!props.enabled()) unavailable();
    }

    private static void unavailable() {
        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "DISCORD_UNAVAILABLE", "지금은 디스코드에 닿지 않아요. 잠시 뒤 다시 시도해 주세요.");
    }

    private static ApiException notLinked() {
        return ApiException.conflict("DISCORD_NOT_LINKED", "디스코드가 연결되어 있지 않아요.");
    }
}
