package com.team.blog.account.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.team.blog.account.domain.AuthProvider;

/** spec 038: 소셜이 준 인증 이메일도 가입·이메일 로그인과 같은 규칙으로 정리한다. */
class SocialProfileTest {
    static SocialProfile withEmail(String email) {
        return new SocialProfile(AuthProvider.GITHUB, "1", "login", "name", email, null);
    }

    @Test
    void verifiedEmailIsTrimmedAndLowercased() {
        assertThat(withEmail("  Mona@Example.COM\n").verifiedEmail()).isEqualTo("mona@example.com");
    }

    @Test
    void emailOutsideOurRulesCountsAsMissing() {
        assertThat(withEmail(null).verifiedEmail()).isNull();
        assertThat(withEmail("   ").verifiedEmail()).isNull();
        assertThat(withEmail("not-an-email").verifiedEmail()).isNull();
        assertThat(withEmail("a".repeat(64) + "@" + "b".repeat(60) + "." + "c".repeat(60) + "." + "d".repeat(60) + "." + "e".repeat(60) + ".com").verifiedEmail())
                .isNull();
    }
}
