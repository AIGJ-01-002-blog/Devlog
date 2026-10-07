package com.team.blog.friend;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.team.blog.friend.application.LastActive;

class LastActiveTest {
    @Test
    void 한국_날짜_기준으로_구간을_나눈다() {
        Instant now = Instant.parse("2026-10-07T01:00:00Z"); // 한국 10:00
        assertThat(LastActive.daysAgo(Instant.parse("2026-10-06T15:00:00Z"), now)).isZero(); // 한국 10/7 00:00
        assertThat(LastActive.daysAgo(Instant.parse("2026-10-06T14:59:59Z"), now)).isEqualTo(1); // 한국 10/6 23:59
        assertThat(LastActive.daysAgo(Instant.parse("2026-10-01T03:00:00Z"), now)).isEqualTo(6);
        assertThat(LastActive.daysAgo(Instant.parse("2026-09-30T03:00:00Z"), now)).isEqualTo(7);
        assertThat(LastActive.daysAgo(Instant.parse("2025-01-01T00:00:00Z"), now)).isEqualTo(7);
        assertThat(LastActive.daysAgo(Instant.parse("2026-10-08T00:00:00Z"), now)).isZero(); // 시계가 조금 어긋나도 음수 없음
    }
}
