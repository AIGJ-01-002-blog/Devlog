package com.team.blog.shared.text;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextCleanerTest {
    @Test
    void 앞뒤의_같은_글자를_모두_뗀다() {
        assertThat(TextCleaner.trim("--a-b--", '-')).isEqualTo("a-b");
        assertThat(TextCleaner.trim("----", '-')).isEmpty();
        assertThat(TextCleaner.trim("", '-')).isEmpty();
        assertThat(TextCleaner.trimEnd("https://blog.example///", '/')).isEqualTo("https://blog.example");
        assertThat(TextCleaner.trimEnd("/a", '/')).isEqualTo("/a");
    }

    @Test
    void 긴_입력도_바로_끝난다() {
        String s = "-".repeat(200_000) + "x" + "-".repeat(200_000);
        assertThat(TextCleaner.trim(s, '-')).isEqualTo("x");
    }
}
