package com.team.blog.account.infra;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.OptionalLong;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.team.blog.shared.error.ApiException;

/**
 * 이메일 인증·비밀번호 재설정 일회용 링크 (docs/07 §3·§4-1). 32바이트 난수, Redis에는 해시만 둔다.
 * 회원마다 마지막으로 보낸 링크 하나만 유효하다: 새로 발급하면 이전 링크는 확인할 때 거부된다.
 * 확인은 원자적으로 지워 한 번만 쓰인다. Redis가 멈추면 확인을 "잠시 후 다시 시도"로 거부한다 (§6).
 */
@Component
public class AuthTokens {
    public enum Kind {
        VERIFY("verify"), RESET("reset");

        final String key;

        Kind(String key) {
            this.key = key;
        }
    }

    private static final SecureRandom RANDOM = new SecureRandom();
    // 토큰 키가 있고 그 회원의 "현재 토큰"이 이 토큰이면 둘 다 지우고 회원 번호를 돌려준다
    private static final RedisScript<Long> CONSUME = RedisScript.of("""
            local member = redis.call('GET', KEYS[1])
            if not member then return -1 end
            redis.call('DEL', KEYS[1])
            local currentKey = ARGV[1] .. member
            if redis.call('GET', currentKey) ~= ARGV[2] then return -1 end
            redis.call('DEL', currentKey)
            return tonumber(member)
            """, Long.class);

    private final StringRedisTemplate redis;

    public AuthTokens(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** @return 링크에 넣을 원문 토큰 */
    public String issue(Kind kind, long memberId, Duration ttl) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String hash = hash(token);
        try {
            redis.opsForValue().set(tokenKey(kind, hash), String.valueOf(memberId), ttl);
            redis.opsForValue().set(currentKey(kind) + memberId, hash, ttl);
        } catch (RuntimeException e) {
            throw unavailable();
        }
        return token;
    }

    /** 한 번만 성공한다. @return 회원 번호, 만료·사용됨·이전 링크면 비어 있음 */
    public OptionalLong consume(Kind kind, String token) {
        if (token == null || token.isBlank() || token.length() > 100) return OptionalLong.empty();
        String hash = hash(token);
        Long member;
        try {
            member = redis.execute(CONSUME, List.of(tokenKey(kind, hash)), currentKey(kind), hash);
        } catch (RuntimeException e) {
            throw unavailable();
        }
        return member == null || member < 0 ? OptionalLong.empty() : OptionalLong.of(member);
    }

    /** 쓰지 않고 확인만 한다 (재설정 화면이 규칙 검사를 마치기 전에 링크를 태우지 않도록). */
    public OptionalLong peek(Kind kind, String token) {
        if (token == null || token.isBlank() || token.length() > 100) return OptionalLong.empty();
        String hash = hash(token);
        try {
            String member = redis.opsForValue().get(tokenKey(kind, hash));
            if (member == null || !hash.equals(redis.opsForValue().get(currentKey(kind) + member))) return OptionalLong.empty();
            return OptionalLong.of(Long.parseLong(member));
        } catch (RuntimeException e) {
            throw unavailable();
        }
    }

    /** 이 회원의 열린 링크를 모두 무효로 (비밀번호를 바꾸면 옛 재설정 링크도 못 쓴다). */
    public void revoke(Kind kind, long memberId) {
        try {
            redis.delete(currentKey(kind) + memberId);
        } catch (RuntimeException ignored) {
            // 확인할 때 현재 토큰과 비교하므로 지우지 못해도 만료되면 사라진다
        }
    }

    private static String tokenKey(Kind kind, String hash) {
        return "auth:" + kind.key + ":" + hash;
    }

    private static String currentKey(Kind kind) {
        return "auth:" + kind.key + ":member:";
    }

    public static String hash(String token) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "TEMPORARILY_UNAVAILABLE", "잠시 후 다시 시도해 주세요.");
    }
}
