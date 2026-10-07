package com.team.blog.shared.config;

import java.time.Duration;
import java.util.List;
import java.util.Set;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * 팀원마다 다를 수 있는 정책 수치 (헌법 VI). 코드에 상수로 박지 않고 application.yml에서 읽는다.
 */
@ConfigurationProperties(prefix = "blog")
public record BlogProperties(
        Site site,
        Web web,
        Agreements agreements,
        Auth auth,
        Handle handle,
        Nickname nickname,
        @DefaultValue Post post,
        @DefaultValue Feed feed,
        @DefaultValue Image image,
        @DefaultValue DevLogin devLogin) {

    public record Site(String baseUrl, @DefaultValue("devlog") String name, @DefaultValue("/og-default.png") String defaultOgImage) {}

    public record Web(@DefaultValue List<String> trustedProxies) {}

    public record Agreements(String termsVersion, String termsEffectiveDate, String privacyVersion, String privacyEffectiveDate) {}

    /**
     * @param verifyTokenTtl    이메일 인증 링크 유효 시간 (docs/07 §3)
     * @param resetTokenTtl     비밀번호 재설정 링크 유효 시간 (docs/07 §4-1)
     * @param loginLockThreshold 같은 계정 연속 실패 허용 횟수, 넘으면 loginLockDuration 동안 잠금 (docs/07 §6)
     * @param mailFrom          보내는 사람 (메일 머리글 From)
     */
    public record Auth(@DefaultValue("10m") Duration pendingSignupTtl,
                       @DefaultValue("20") int loginRateLimitPerMinute,
                       @DefaultValue("30") int availabilityRateLimitPerMinute,
                       @DefaultValue("24h") Duration verifyTokenTtl,
                       @DefaultValue("30m") Duration resetTokenTtl,
                       @DefaultValue("5") int loginLockThreshold,
                       @DefaultValue("15m") Duration loginLockDuration,
                       @DefaultValue("devlog <no-reply@devlog.local>") String mailFrom) {}

    public record Handle(@DefaultValue("16") int autoBodyMaxLength, @DefaultValue Set<String> reserved) {}

    public record Nickname(@DefaultValue("30d") Duration changeCooldown, @DefaultValue List<String> reserved) {}

    public record Post(@DefaultValue("100000") int maxContentLength,
                       @DefaultValue("100") int maxTitleLength,
                       @DefaultValue("200") int excerptLength,
                       @DefaultValue("20") int maxNestingDepth,
                       @DefaultValue("1s") Duration renderTimeout,
                       @DefaultValue("24h") Duration autosaveTtl,
                       @DefaultValue("5s") Duration autosaveMinInterval,
                       @DefaultValue("10m") Duration idempotencyTtl,
                       @DefaultValue("24h") Duration emptyDraftTtl,
                       @DefaultValue("60") int previewRateLimitPerMinute,
                       @DefaultValue("10") int maxTags) {}

    public record Feed(@DefaultValue("9") int pageSize, @DefaultValue("20") int managePageSize) {}

    /**
     * 본문 사진 (009, docs/23 §3). 공개 주소(public-base-url)는 ImageUrls가 따로 읽는다.
     * @param quota      1인 사진 저장 공간 (원본 + 썸네일, 프로필 사진 포함)
     * @param dailyLimit 하루(한국 0시 기준) 업로드 장수. 실패한 업로드도 센다
     */
    public record Image(@DefaultValue("1GB") org.springframework.util.unit.DataSize quota,
                        @DefaultValue("200") int dailyLimit,
                        @DefaultValue("20") int perMinute) {}

    public record DevLogin(@DefaultValue("false") boolean enabled) {}
}
