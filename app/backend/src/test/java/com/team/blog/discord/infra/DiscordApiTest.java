package com.team.blog.discord.infra;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** 웹훅 주소 읽기 (078 FR-002): 디스코드 공식 주소만 받고 번호·토큰만 뗀다. */
class DiscordApiTest {
    static final String TOKEN = "Abc-def_ghiJKLmnopQRSTuvwxYZ0123456789abcdefghijklmnopqrstuvwxyzAB";

    @Test
    void 디스코드_앱이_주는_주소_꼴을_모두_받는다() {
        for (String host : new String[] {"discord.com", "ptb.discord.com", "canary.discord.com", "discordapp.com"}) {
            assertThat(DiscordApi.parse("https://" + host + "/api/webhooks/123456789012345678/" + TOKEN))
                    .contains(new DiscordApi.Webhook("123456789012345678", TOKEN));
        }
        assertThat(DiscordApi.parse("  https://discord.com/api/v10/webhooks/123456789012345678/" + TOKEN + "/  ")).isPresent();
    }

    @Test
    void 다른_곳을_가리키는_주소는_받지_않는다() {
        assertThat(DiscordApi.parse(null)).isEmpty();
        assertThat(DiscordApi.parse("http://discord.com/api/webhooks/123456789012345678/" + TOKEN)).isEmpty();
        assertThat(DiscordApi.parse("https://discord.com.evil.example/api/webhooks/123456789012345678/" + TOKEN)).isEmpty();
        assertThat(DiscordApi.parse("https://user@discord.com/api/webhooks/123456789012345678/" + TOKEN)).isEmpty();
        assertThat(DiscordApi.parse("https://discord.com/api/webhooks/123456789012345678/" + TOKEN + "?wait=true")).isEmpty();
        assertThat(DiscordApi.parse("https://discord.com/api/webhooks/abc/" + TOKEN)).isEmpty();
    }

    @Test
    void 토큰은_문자열로_찍히지_않는다() {
        assertThat(new DiscordApi.Webhook("1", TOKEN).toString()).doesNotContain(TOKEN);
    }
}
