package com.team.blog.post.infra;

import java.time.Duration;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Idempotency-Key 저장소 (docs/05 §6). 값은 "{요청 해시}|IN_PROGRESS" 또는 "{요청 해시}|DONE|{응답 JSON}".
 * Redis가 멈추면 잠금 없이 통과시킨다 — 그때는 행 잠금과 버전 확인이 중복 발행을 막는다.
 */
@Component
public class IdempotencyStore {
    private static final Logger log = LoggerFactory.getLogger(IdempotencyStore.class);
    private static final String IN_PROGRESS = "IN_PROGRESS";
    private static final String DONE = "DONE";

    private final StringRedisTemplate redis;

    public IdempotencyStore(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public sealed interface Claim {
        /** 처음 온 요청. 처리하고 complete/release를 부른다. */
        record Acquired(boolean tracked) implements Claim {}
        record InProgress() implements Claim {}
        record Mismatch() implements Claim {}
        record Completed(String responseJson) implements Claim {}
    }

    public Claim claim(String key, String requestHash, Duration ttl) {
        try {
            Boolean set = redis.opsForValue().setIfAbsent(key, requestHash + "|" + IN_PROGRESS, ttl);
            if (Boolean.TRUE.equals(set)) return new Claim.Acquired(true);
            String v = redis.opsForValue().get(key);
            if (v == null) return claim(key, requestHash, ttl); // 그 사이 만료·삭제됨
            String[] parts = v.split("\\|", 3);
            if (!parts[0].equals(requestHash)) return new Claim.Mismatch();
            if (IN_PROGRESS.equals(parts[1])) return new Claim.InProgress();
            return new Claim.Completed(parts.length > 2 ? parts[2] : "{}");
        } catch (RuntimeException e) {
            log.warn("Idempotency 저장소를 쓸 수 없어 잠금 없이 진행합니다: {}", e.getMessage());
            return new Claim.Acquired(false);
        }
    }

    public void complete(String key, String requestHash, String responseJson, Duration ttl) {
        try {
            redis.opsForValue().set(key, requestHash + "|" + DONE + "|" + responseJson, ttl);
        } catch (RuntimeException e) {
            log.warn("Idempotency 응답을 저장하지 못했습니다: {}", e.getMessage());
        }
    }

    /** 실패하면 키를 지워 같은 키로 다시 시도할 수 있게 한다. */
    public void release(String key) {
        try {
            redis.delete(key);
        } catch (RuntimeException e) {
            log.warn("Idempotency 키를 지우지 못했습니다: {}", e.getMessage());
        }
    }

    public Optional<String> peek(String key) {
        return Optional.ofNullable(redis.opsForValue().get(key));
    }
}
