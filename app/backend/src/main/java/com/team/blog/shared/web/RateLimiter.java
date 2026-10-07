package com.team.blog.shared.web;

import java.time.Duration;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

/**
 * Redis 고정 창 카운터. Redis 장애 중에는 통과시킨다 (docs/02 §2-1: 요청 제한은 장애 시 통과 + 경고 로그).
 */
@Component
public class RateLimiter {
    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);
    private static final RedisScript<Long> INCR_EXPIRE = RedisScript.of("""
            local c = redis.call('INCR', KEYS[1])
            if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
            return c
            """, Long.class);

    private final StringRedisTemplate redis;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** @return 허용되면 true */
    public boolean tryAcquire(String key, int limit, Duration window) {
        try {
            Long count = redis.execute(INCR_EXPIRE, List.of("rl:" + key), String.valueOf(window.toMillis()));
            return count == null || count <= limit;
        } catch (RuntimeException e) {
            log.warn("요청 제한 카운터를 쓸 수 없어 통과시킵니다: {}", e.getMessage());
            return true;
        }
    }

    public void check(String key, int limit, Duration window) {
        if (!tryAcquire(key, limit, window)) throw new TooManyRequestsException(window.toSeconds());
    }
}
