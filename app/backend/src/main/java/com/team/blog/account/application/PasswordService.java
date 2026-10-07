package com.team.blog.account.application;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.account.domain.AuthIdentity;
import com.team.blog.account.domain.AuthProvider;
import com.team.blog.account.infra.AuthIdentityRepository;
import com.team.blog.account.infra.AuthTokens;
import com.team.blog.account.infra.LoginAttempts;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.mail.Mailer;
import com.team.blog.shared.security.SessionTerminator;
import com.team.blog.shared.time.Times;
import com.team.blog.shared.web.RateLimiter;

/**
 * 비밀번호 재설정(docs/07 §4-1, 004 US3)과 변경(docs/11 §6-2, US5).
 * 재설정 요청은 가입 여부와 상관없이 같은 응답이고, 메일은 그 이메일로만 간다.
 * 재설정하면 모든 기기, 변경하면 지금 기기를 뺀 모든 기기에서 로그아웃된다.
 */
@Service
public class PasswordService {
    private final AuthIdentityRepository identities;
    private final PasswordPolicy policy;
    private final PasswordEncoder encoder;
    private final AuthTokens tokens;
    private final LoginAttempts attempts;
    private final RateLimiter limiter;
    private final Mailer mailer;
    private final AccountMails mails;
    private final SessionTerminator sessions;
    private final TransactionTemplate tx;
    private final Duration resetTtl;
    private final java.time.Clock clock;

    public PasswordService(AuthIdentityRepository identities, PasswordPolicy policy, PasswordEncoder encoder, AuthTokens tokens,
                           LoginAttempts attempts, RateLimiter limiter, Mailer mailer, AccountMails mails,
                           SessionTerminator sessions, TransactionTemplate tx, BlogProperties props, java.time.Clock clock) {
        this.identities = identities;
        this.policy = policy;
        this.encoder = encoder;
        this.tokens = tokens;
        this.attempts = attempts;
        this.limiter = limiter;
        this.mailer = mailer;
        this.mails = mails;
        this.sessions = sessions;
        this.tx = tx;
        this.resetTtl = props.auth().resetTokenTtl();
        this.clock = clock;
    }

    /** 항상 같은 결과(202). 같은 IP 1시간 20번을 넘으면 429, 같은 이메일 1분 1번·하루 10번을 넘으면 조용히 보내지 않는다. */
    public void requestReset(String rawEmail, String ip) {
        limiter.check("reset:ip:" + ip, 20, Duration.ofHours(1));
        String email = EmailAddress.normalize(rawEmail);
        if (!EmailAddress.isValid(email)) {
            throw ApiException.validation(List.of(new FieldErrorItem("email", "EMAIL_INVALID", "이메일 형식을 확인해 주세요.")));
        }
        String emailKey = AuthTokens.hash(email); // 요청 제한 키에 이메일을 그대로 두지 않는다
        if (!limiter.tryAcquire("reset:min:" + emailKey, 1, Duration.ofMinutes(1))) return;
        if (!limiter.tryAcquire("reset:day:" + emailKey, 10, Duration.ofDays(1))) return;

        List<AuthIdentity> all = identities.findByEmail(email);
        Optional<AuthIdentity> local = all.stream().filter(i -> i.getProvider() == AuthProvider.LOCAL).findFirst();
        List<AuthProvider> socials = all.stream().map(AuthIdentity::getProvider).filter(p -> p != AuthProvider.LOCAL).distinct().toList();
        if (local.isPresent()) {
            String token = tokens.issue(AuthTokens.Kind.RESET, local.get().getMemberId(), resetTtl);
            mailer.send(mails.reset(email, token, resetTtl, socials));
        } else if (!socials.isEmpty()) {
            mailer.send(mails.socialOnly(email, socials));
        }
    }

    /** 링크가 아직 쓸 수 있는지 (화면을 열 때). */
    public boolean isResetLinkValid(String token) {
        return tokens.peek(AuthTokens.Kind.RESET, token).isPresent();
    }

    public void reset(String token, String password, String passwordConfirm) {
        long memberId = tokens.peek(AuthTokens.Kind.RESET, token).orElseThrow(PasswordService::linkExpired);
        AuthIdentity identity = identities.findByMemberId(memberId).filter(i -> i.getProvider() == AuthProvider.LOCAL)
                .orElseThrow(PasswordService::linkExpired);
        validateNew(password, passwordConfirm, identity.getEmail(), null);
        // 규칙을 통과한 뒤에야 링크를 쓴다 (규칙 오류로 링크가 사라지지 않게). 그 사이 새 링크가 나갔으면 실패한다
        long consumed = tokens.consume(AuthTokens.Kind.RESET, token).orElseThrow(PasswordService::linkExpired);
        if (consumed != memberId) throw linkExpired();
        String hash = encoder.encode(password);
        tx.executeWithoutResult(s -> identities.findByMemberId(memberId).ifPresent(i -> {
            i.changePasswordHash(hash);
            i.markEmailVerified(Times.now(clock)); // 메일 링크를 연 것으로 이메일 소유가 확인됐다
        }));
        attempts.reset("login:" + identity.getEmail());
        sessions.terminate(memberId, null);
    }

    /** @param currentSessionId 남길 지금 기기 세션 */
    public void change(long memberId, String current, String password, String passwordConfirm, String currentSessionId) {
        AuthIdentity identity = identities.findByMemberId(memberId).orElseThrow();
        if (identity.getProvider() != AuthProvider.LOCAL) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PASSWORD_NOT_SUPPORTED", "소셜 로그인 계정은 비밀번호가 없어요.");
        }
        String subject = "pwchange:" + memberId;
        if (attempts.isLocked(subject)) throw EmailAccountService.locked(attempts.lockMinutes());
        if (current == null || !encoder.matches(current, identity.getPasswordHash())) {
            attempts.recordFailure(subject);
            throw ApiException.validation(List.of(new FieldErrorItem("currentPassword", "PASSWORD_WRONG", "현재 비밀번호가 올바르지 않아요.")));
        }
        attempts.reset(subject);
        validateNew(password, passwordConfirm, identity.getEmail(), identity.getPasswordHash());
        String hash = encoder.encode(password);
        tx.executeWithoutResult(s -> identities.findByMemberId(memberId).ifPresent(i -> i.changePasswordHash(hash)));
        tokens.revoke(AuthTokens.Kind.RESET, memberId);
        sessions.terminate(memberId, currentSessionId);
        mailer.send(mails.passwordChanged(identity.getEmail()));
    }

    private void validateNew(String password, String confirm, String email, String currentHash) {
        List<FieldErrorItem> errors = new ArrayList<>(policy.errors("password", password, email));
        if (password == null || !password.equals(confirm)) {
            errors.add(new FieldErrorItem("passwordConfirm", "PASSWORD_MISMATCH", "비밀번호가 서로 달라요."));
        }
        if (errors.isEmpty() && currentHash != null && encoder.matches(password, currentHash)) {
            errors.add(new FieldErrorItem("password", "PASSWORD_SAME", "현재 비밀번호와 다른 비밀번호를 써 주세요."));
        }
        if (!errors.isEmpty()) throw ApiException.validation(errors);
    }

    private static ApiException linkExpired() {
        return new ApiException(HttpStatus.GONE, "LINK_EXPIRED", "링크가 만료됐어요. 비밀번호 찾기를 다시 해 주세요.");
    }
}
