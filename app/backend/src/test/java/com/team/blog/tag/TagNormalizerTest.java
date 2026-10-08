package com.team.blog.tag;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.team.blog.account.application.WordFilter;
import com.team.blog.tag.application.TagNormalizer;
import com.team.blog.tag.application.TagNormalizer.Code;

/** docs/22 §2-1 예시 전체 (SC-001). */
class TagNormalizerTest {
    final TagNormalizer normalizer = new TagNormalizer(new WordFilter());

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "Spring Boot|spring-boot",
            "spring-boot|spring-boot",
            "#SPRING  BOOT|spring-boot",
            "ｓｐｒｉｎｇ　ｂｏｏｔ|spring-boot",
            "#JPA|jpa",
            "'  C++ '|c++",
            "C#|c#",
            "Node.JS|node.js",
            ".NET|.net",
            "ｓｐｒｉｎｇ|spring",
            "스프링  부트|스프링-부트",
            "spring--boot|spring-boot",
            "spring--boot-|spring-boot",
            "자바_기초|자바_기초",
            "##java|java",
            "'\u200Bja\u202Eva\u0007'|java",
    })
    void 같은_뜻의_입력은_같은_모양이_된다(String raw, String expected) {
        assertThat(TagNormalizer.clean(raw)).isEqualTo(expected);
    }

    @Test
    void 지역_설정과_무관하게_소문자로_바꾼다() {
        java.util.Locale before = java.util.Locale.getDefault();
        try {
            java.util.Locale.setDefault(java.util.Locale.forLanguageTag("tr"));
            assertThat(TagNormalizer.clean("JAVA TITLE")).isEqualTo("java-title");
        } finally {
            java.util.Locale.setDefault(before);
        }
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "...|INVALID_TAG", "---|INVALID_TAG", "#|INVALID_TAG", "ㅋㅋ|INVALID_TAG", "ㅅㅂ|INVALID_TAG",
            "🔥hot|INVALID_TAG", "a/b|INVALID_TAG", "c@d|INVALID_TAG", "..|INVALID_TAG", "'   '|INVALID_TAG",
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|TAG_TOO_LONG", "시발공부|TAG_BANNED_WORD",
    })
    void 허용되지_않는_태그는_이유와_함께_거부한다(String raw, Code code) {
        assertThat(normalizer.check(raw).code()).isEqualTo(code);
    }

    @Test
    void 서른_자는_받는다() {
        assertThat(normalizer.check("a".repeat(30)).ok()).isTrue();
        assertThat(normalizer.check("가".repeat(30)).ok()).isTrue();
        assertThat(normalizer.check("가".repeat(31)).code()).isEqualTo(Code.TAG_TOO_LONG);
    }

    @Test
    void 주소용_정규화는_형식만_본다() {
        assertThat(TagNormalizer.canonical("Spring Boot")).contains("spring-boot");
        assertThat(TagNormalizer.canonical("🔥")).isEmpty();
        assertThat(TagNormalizer.canonical(".")).isEmpty();
    }
}
