package com.team.blog.shared.security;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;

/**
 * 세션에 담는 현재 사용자. 작성자 ID를 요청 값으로 받지 않고 항상 여기서 꺼낸다 (docs/02 §5).
 *
 * @param agreementRequired 로그인할 때 약관·처리방침 버전이 바뀌어 재동의가 필요했는지 (docs/07 §3-1)
 * @param previousLoginAt   이번 로그인 직전의 마지막 로그인 시각. 첫 로그인이면 null (docs/07 §6 "직전 로그인")
 */
public record MemberPrincipal(long id, String handle, String role, String provider,
                              boolean agreementRequired, Instant previousLoginAt) implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }

    public MemberPrincipal withAgreementAccepted() {
        return new MemberPrincipal(id, handle, role, provider, false, previousLoginAt);
    }
}
