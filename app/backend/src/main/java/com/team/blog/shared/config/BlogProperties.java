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
        @DefaultValue DevLogin devLogin) {

    public record Site(String baseUrl, @DefaultValue("devlog") String name, @DefaultValue("/og-default.png") String defaultOgImage) {}

    public record Web(@DefaultValue List<String> trustedProxies) {}

    public record Agreements(String termsVersion, String termsEffectiveDate, String privacyVersion, String privacyEffectiveDate) {}

    public record Auth(@DefaultValue("10m") Duration pendingSignupTtl,
                       @DefaultValue("20") int loginRateLimitPerMinute,
                       @DefaultValue("30") int availabilityRateLimitPerMinute) {}

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

    public record DevLogin(@DefaultValue("false") boolean enabled) {}
}
