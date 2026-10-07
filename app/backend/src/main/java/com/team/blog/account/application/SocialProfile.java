package com.team.blog.account.application;

import java.io.Serial;
import java.io.Serializable;

import com.team.blog.account.domain.AuthProvider;

/**
 * 소셜 인증이 돌려준 프로필. providerUserId는 바뀌지 않는 고유 번호(GitHub 숫자 ID)이고 login은 바뀔 수 있다 (docs/07 §5).
 * @param verifiedEmail 인증된 대표 이메일. 없으면 null. 가입·이메일 로그인과 같은 규칙({@link EmailAddress})으로 정리하고,
 *                      그 규칙에 맞지 않으면(비었거나 254자 초과 등) 없는 것으로 보아 가입 마무리 화면에서 다시 받는다
 */
public record SocialProfile(AuthProvider provider, String providerUserId, String login, String name,
                            String verifiedEmail, String avatarUrl) implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    public SocialProfile {
        if (verifiedEmail != null) {
            String normalized = EmailAddress.normalize(verifiedEmail);
            verifiedEmail = EmailAddress.isValid(normalized) ? normalized : null;
        }
    }
}
