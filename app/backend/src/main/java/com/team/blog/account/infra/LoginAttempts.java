package com.team.blog.account.infra;

import java.time.Duration;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import com.team.blog.shared.config.BlogProperties;

/**
 * 같은 계정 연속 실패 잠금 (docs/07 §6: 5회 → 15분). 키는 이메일(로그인)이나 회원(비밀번호 변경)이다.
 * 가입되지 않은 이메일도 똑같이 세어 잠금 여부로 가입 여부를 알 수 없게 한다. Redis 장애 중에는 통과시킨다.
 */
@Component
public class LoginAttempts {
    private static final Logger log = LoggerFactory.getLogger(LoginAttempts.class);
    private static final RedisScript<Long> FAIL = RedisScript.of("""
            local c = redis.call('INCR', KEYS[1])
            redis.call('PEXPIRE', KEYS[1], ARGV[1])
            return c
            """, Long.class);

    private final StringRedisTemplate redis;
    private final int threshold;
    private final Duration lock;

    public LoginAttempts(StringRedisTemplate redis, BlogProperties props) {
        this.redis = redis;
        this.threshold = props.auth().loginLockThreshold();
        this.lock = props.auth().loginLockDuration();
    }

    public boolean isLocked(String subject) {
        try {
            String v = redis.opsForValue().get(key(subject));
            return v != null && Long.parseLong(v) >= threshold;
        } catch (RuntimeException e) {
            log.warn("로그인 실패 카운터를 읽을 수 없어 통과시킵니다: {}", e.getMessage());
            return false;
        }
    }

    /** 실패를 하나 더한다. 마지막 실패부터 잠금 시간이 다시 계산된다. */
    public void recordFailure(String subject) {
        try {
            redis.execute(FAIL, List.of(key(subject)), String.valueOf(lock.toMillis()));
        } catch (RuntimeException e) {
            log.warn("로그인 실패 카운터를 쓸 수 없습니다: {}", e.getMessage());
        }
    }

    public void reset(String subject) {
        try {
            redis.delete(key(subject));
        } catch (RuntimeException ignored) {
            // 다음 실패 때 TTL로 정리된다
        }
    }

    public long lockMinutes() {
        return lock.toMinutes();
    }

    /** 이메일이 키에 그대로 남지 않게 해시한다. */
    private static String key(String subject) {
        return "auth:fail:" + AuthTokens.hash(subject);
    }
}
