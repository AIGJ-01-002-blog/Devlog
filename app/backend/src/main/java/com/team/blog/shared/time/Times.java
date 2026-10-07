package com.team.blog.shared.time;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** PostgreSQL timestamptz 정밀도(마이크로초)에 맞춘 현재 시각. 커서 비교가 어긋나지 않게 한다 (docs/10 §4-2). */
public final class Times {
    private Times() {}

    public static Instant now(Clock clock) {
        return Instant.now(clock).truncatedTo(ChronoUnit.MICROS);
    }

    public static long toEpochMicros(Instant instant) {
        return ChronoUnit.MICROS.between(Instant.EPOCH, instant);
    }

    public static Instant fromEpochMicros(long micros) {
        return Instant.EPOCH.plus(micros, ChronoUnit.MICROS);
    }
}
