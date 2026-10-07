package com.team.blog.account.application;

import java.io.Serial;
import java.io.Serializable;

import com.team.blog.account.domain.AuthProvider;

/**
 * 소셜 인증이 돌려준 프로필. providerUserId는 바뀌지 않는 고유 번호(GitHub 숫자 ID)이고 login은 바뀔 수 있다 (docs/07 §5).
 * @param verifiedEmail 인증된 대표 이메일. 없으면 null
 */
public record SocialProfile(AuthProvider provider, String providerUserId, String login, String name,
                            String verifiedEmail, String avatarUrl) implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
}
