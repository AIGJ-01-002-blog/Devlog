package com.team.blog.shared.scheduling;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

/**
 * 서버가 여러 대(쿠버네티스 복제본)여도 예약 작업이 한 번만 돌게 하는 Redis 잠금 (docs/04 §2-4 ShedLock 대체).
 * 잠금을 못 잡으면(다른 서버가 실행 중이거나 Redis 장애) 이번 차례는 건너뛴다.
 */
@Component
public class JobLock {
    private static final Logger log = LoggerFactory.getLogger(JobLock.class);
    private static final RedisScript<Long> RELEASE = RedisScript.of(
            "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0", Long.class);

    private final StringRedisTemplate redis;

    public JobLock(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** @return 실행했으면 true */
    public boolean runExclusively(String name, Duration maxRunTime, Runnable job) {
        String key = "lock:job:" + name;
        String token = UUID.randomUUID().toString();
        try {
            if (!Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(key, token, maxRunTime))) return false;
        } catch (RuntimeException e) {
            log.warn("작업 잠금을 잡지 못해 {}을(를) 건너뜁니다: {}", name, e.getMessage());
            return false;
        }
        try {
            job.run();
            return true;
        } finally {
            try {
                redis.execute(RELEASE, List.of(key), token);
            } catch (RuntimeException e) {
                log.warn("작업 잠금을 풀지 못했습니다. 만료되면 풀립니다: {}", e.getMessage());
            }
        }
    }
}
