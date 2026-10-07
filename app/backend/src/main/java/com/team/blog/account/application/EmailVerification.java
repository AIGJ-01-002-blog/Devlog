package com.team.blog.account.application;

import java.time.Clock;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.account.domain.AuthIdentity;
import com.team.blog.account.infra.AuthIdentityRepository;
import com.team.blog.account.infra.AuthTokens;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.mail.Mailer;
import com.team.blog.shared.time.Times;
import com.team.blog.shared.web.RateLimiter;

/**
 * 이메일 인증 (docs/07 §3, 004 FR-006·FR-007·FR-028). 링크는 24시간·한 번·마지막 것만 유효하고,
 * 다시 보내기는 회원마다 1분에 1번·하루 10번이다.
 */
@Component
public class EmailVerification {
    private static final Logger log = LoggerFactory.getLogger(EmailVerification.class);

    private final AuthTokens tokens;
    private final AuthIdentityRepository identities;
    private final Mailer mailer;
    private final AccountMails mails;
    private final RateLimiter limiter;
    private final TransactionTemplate tx;
    private final Duration ttl;
    private final Clock clock;

    public EmailVerification(AuthTokens tokens, AuthIdentityRepository identities, Mailer mailer, AccountMails mails,
                             RateLimiter limiter, TransactionTemplate tx, BlogProperties props, Clock clock) {
        this.tokens = tokens;
        this.identities = identities;
        this.mailer = mailer;
        this.mails = mails;
        this.limiter = limiter;
        this.tx = tx;
        this.ttl = props.auth().verifyTokenTtl();
        this.clock = clock;
    }

    /** 가입 직후. 링크를 만들 수 없으면(세션 저장소 장애) 가입은 그대로 두고 다시 보내기로 받게 한다. */
    public void sendAfterSignup(long memberId, String email) {
        try {
            mailer.send(mails.verify(email, tokens.issue(AuthTokens.Kind.VERIFY, memberId, ttl), ttl));
        } catch (ApiException e) {
            log.warn("회원 {}의 인증 메일을 만들지 못했습니다: {}", memberId, e.getMessage());
        }
    }

    public void resend(long memberId) {
        AuthIdentity identity = identities.findByMemberId(memberId).orElseThrow();
        if (identity.isEmailVerified()) throw ApiException.conflict("ALREADY_VERIFIED", "이미 인증된 이메일이에요.");
        limiter.check("verify:min:" + memberId, 1, Duration.ofMinutes(1));
        limiter.check("verify:day:" + memberId, 10, Duration.ofDays(1));
        mailer.send(mails.verify(identity.getEmail(), tokens.issue(AuthTokens.Kind.VERIFY, memberId, ttl), ttl));
    }

    /** @return 인증된 회원 번호 */
    public long verify(String token) {
        long memberId = tokens.consume(AuthTokens.Kind.VERIFY, token)
                .orElseThrow(() -> new ApiException(HttpStatus.GONE, "LINK_EXPIRED", "링크가 만료됐어요."));
        tx.executeWithoutResult(s -> identities.findByMemberId(memberId).ifPresent(i -> i.markEmailVerified(Times.now(clock))));
        return memberId;
    }

    public boolean isVerified(long memberId) {
        return identities.findByMemberId(memberId).map(AuthIdentity::isEmailVerified).orElse(false);
    }
}
