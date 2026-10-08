package com.team.blog.telegram.application;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.jdbc.Columns;
import com.team.blog.shared.time.Times;
import com.team.blog.telegram.infra.TelegramApi;

/**
 * 회원 ↔ 텔레그램 대화 연결 (023 US1). 설정 화면이 1회용 코드를 받고, 회원이 봇에서 /start 코드를 보내면 연결된다.
 * 코드는 Redis에만 두고(10분), 회원 번호는 코드에 드러나지 않는다(FR-002). 대화 하나 = 회원 하나(FR-003).
 */
@Service
@EnableConfigurationProperties(TelegramProperties.class)
public class TelegramLinks {
    static final String CODE_PREFIX = "tg:link:";
    private static final String MEMBER_CODE_PREFIX = "tg:link-of:";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final TelegramProperties props;
    private final TelegramApi api;
    private final StringRedisTemplate redis;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final Clock clock;

    public TelegramLinks(TelegramProperties props, TelegramApi api, StringRedisTemplate redis, JdbcTemplate jdbc,
                         TransactionTemplate tx, Clock clock) {
        this.props = props;
        this.api = api;
        this.redis = redis;
        this.jdbc = jdbc;
        this.tx = tx;
        this.clock = clock;
    }

    /** @param available 기능이 켜져 있고 봇 이름을 알 수 있으면 true. false면 설정 화면이 항목을 숨긴다 */
    private static final DefaultRedisScript<Long> DELETE_IF_SAME = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0", Long.class);

    public record Status(boolean available, String botUsername, boolean linked, boolean notifications, Instant linkedAt) {}

    public record Link(String url, Instant expiresAt) {}

    public record Linked(long chatId, boolean notifications) {}

    public Status status(long memberId) {
        Optional<String> bot = allowed(memberId) ? api.botUsername() : Optional.empty();
        List<Status> rows = jdbc.query("SELECT notify, linked_at FROM member_telegram WHERE member_id = ?",
                (rs, i) -> new Status(bot.isPresent(), bot.orElse(null), true, rs.getBoolean(1), rs.getTimestamp(2).toInstant()), memberId);
        return rows.isEmpty() ? new Status(bot.isPresent(), bot.orElse(null), false, false, null) : rows.getFirst();
    }

    /** 새 연결 주소. 전에 받은 코드는 무효가 된다. */
    public Link issue(long memberId) {
        if (props.available() && !allowed(memberId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "TELEGRAM_NOT_ALLOWED", "텔레그램 연결은 아직 일부 계정만 쓸 수 있어요.");
        }
        String bot = props.available() ? api.botUsername().orElse(null) : null;
        if (bot == null) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "TELEGRAM_UNAVAILABLE", "지금은 텔레그램을 연결할 수 없어요.");
        byte[] raw = new byte[18];
        RANDOM.nextBytes(raw);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        String old = redis.opsForValue().getAndSet(MEMBER_CODE_PREFIX + memberId, code);
        if (old != null) redis.delete(CODE_PREFIX + old);
        redis.expire(MEMBER_CODE_PREFIX + memberId, props.linkTtl());
        redis.opsForValue().set(CODE_PREFIX + code, Long.toString(memberId), props.linkTtl());
        return new Link("https://t.me/" + bot + "?start=" + code, Times.now(clock).plus(props.linkTtl()));
    }

    /**
     * 봇에서 받은 코드로 연결한다 (US1-2·3). 코드는 한 번만 쓰인다. 그 대화가 다른 회원에게 연결돼 있었으면 옮긴다.
     * @return 연결한 회원 닉네임. 코드가 없거나 만료됐거나 연결할 수 없는 회원이면 비어 있다
     */
    public Optional<String> link(String code, long chatId) {
        if (code == null || code.isBlank() || code.length() > 64) return Optional.empty();
        String member = redis.opsForValue().getAndDelete(CODE_PREFIX + code);
        if (member == null) return Optional.empty();
        long memberId = Long.parseLong(member);
        // 그 사이 새 코드를 받았으면 새 코드의 역방향 키는 남긴다
        redis.execute(DELETE_IF_SAME, List.of(MEMBER_CODE_PREFIX + memberId), code);
        return Optional.ofNullable(tx.execute(s -> {
            List<String> nick = Columns.strings(jdbc, """
                    SELECT nickname FROM member m WHERE id = ? AND status <> 'WITHDRAWN' AND deleted_at IS NULL AND %s FOR UPDATE
                    """.formatted(props.audienceSql()), memberId);
            if (nick.isEmpty()) return null;
            jdbc.update("DELETE FROM member_telegram WHERE chat_id = ? AND member_id <> ?", chatId, memberId);
            jdbc.update("""
                    INSERT INTO member_telegram (member_id, chat_id, notify, linked_at) VALUES (?, ?, true, now())
                    ON CONFLICT (member_id) DO UPDATE SET chat_id = EXCLUDED.chat_id, notify = true, linked_at = now()
                    """, memberId, chatId);
            return nick.getFirst();
        }));
    }

    public boolean unlink(long memberId) {
        return jdbc.update("DELETE FROM member_telegram WHERE member_id = ?", memberId) > 0;
    }

    public boolean unlinkChat(long chatId) {
        return jdbc.update("DELETE FROM member_telegram WHERE chat_id = ?", chatId) > 0;
    }

    public Status setNotify(long memberId, boolean notify) {
        if (jdbc.update("UPDATE member_telegram SET notify = ? WHERE member_id = ?", notify, memberId) == 0) {
            throw ApiException.conflict("TELEGRAM_NOT_LINKED", "텔레그램이 연결되어 있지 않아요.");
        }
        return status(memberId);
    }

    /** 연결할 수 있는 회원인지 (audience). 대상이 줄면 남은 연결도 쓰지 않는다 */
    public boolean allowed(long memberId) {
        return props.available() && Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM member m WHERE m.id = ? AND " + props.audienceSql() + ")", Boolean.class, memberId));
    }

    public Optional<Linked> chatOf(long memberId) {
        return jdbc.query("SELECT t.chat_id, t.notify FROM member_telegram t JOIN member m ON m.id = t.member_id WHERE t.member_id = ?"
                        + " AND m.status <> 'WITHDRAWN' AND m.deleted_at IS NULL AND " + props.audienceSql(),
                (rs, i) -> new Linked(rs.getLong(1), rs.getBoolean(2)), memberId).stream().findFirst();
    }

    public Optional<Long> memberOf(long chatId) {
        return Columns.firstLong(jdbc, "SELECT t.member_id FROM member_telegram t JOIN member m ON m.id = t.member_id WHERE t.chat_id = ? AND "
                + props.audienceSql(), chatId);
    }
}
