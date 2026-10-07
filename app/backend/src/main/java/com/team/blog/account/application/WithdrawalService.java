package com.team.blog.account.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.account.domain.AuthIdentity;
import com.team.blog.account.domain.AuthProvider;
import com.team.blog.account.domain.Member;
import com.team.blog.account.domain.MemberStatus;
import com.team.blog.account.domain.Role;
import com.team.blog.account.infra.AuthIdentityRepository;
import com.team.blog.account.infra.LoginAttempts;
import com.team.blog.account.infra.MemberRepository;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.mail.Mailer;
import com.team.blog.shared.security.SessionTerminator;
import com.team.blog.shared.time.Times;

/**
 * 회원 탈퇴 신청과 복구 (020 US1·US2, docs/44 §2·§3).
 * 탈퇴는 상태와 신청 일자만 바꾸고(데이터는 30일 동안 그대로), 공개 목록 공용 조건과 상세 읽기 판정이 블로그·글을 가린다(FR-010).
 */
@Service
public class WithdrawalService {
    public static final Duration GRACE = Duration.ofDays(30);
    /** 소셜 가입 본인 확인 문구 (FR-007) */
    public static final String CONFIRM_TEXT = "탈퇴";
    private static final DateTimeFormatter DEADLINE = DateTimeFormatter.ofPattern("M월 d일 HH:mm").withZone(ZoneId.of("Asia/Seoul"));

    private final MemberRepository members;
    private final AuthIdentityRepository identities;
    private final PasswordEncoder encoder;
    private final LoginAttempts attempts;
    private final SessionTerminator sessions;
    private final Mailer mailer;
    private final AccountMails mails;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public WithdrawalService(MemberRepository members, AuthIdentityRepository identities, PasswordEncoder encoder,
                             LoginAttempts attempts, SessionTerminator sessions, Mailer mailer, AccountMails mails,
                             JdbcTemplate jdbc, TransactionTemplate tx, ApplicationEventPublisher events, Clock clock) {
        this.members = members;
        this.identities = identities;
        this.encoder = encoder;
        this.attempts = attempts;
        this.sessions = sessions;
        this.mailer = mailer;
        this.mails = mails;
        this.jdbc = jdbc;
        this.tx = tx;
        this.events = events;
        this.clock = clock;
    }

    /** PASSWORD: 이메일 가입(비밀번호 확인), CONFIRM_TEXT: 소셜 가입("탈퇴" 입력) */
    public enum Method { PASSWORD, CONFIRM_TEXT }

    /**
     * 탈퇴 화면 안내(FR-003)와 복구 화면(FR-016)이 함께 쓴다. 숫자는 화면을 열 때 계산한다.
     * @param withdrawn 이미 탈퇴 신청했으면 true, restoreBy는 그 신청의 복구 기한
     */
    public record Summary(String handle, boolean withdrawn, Instant restoreBy, long posts, long comments, long likesReceived,
                          Method method, boolean admin) {}

    public Summary summary(long memberId) {
        Member m = members.findById(memberId).orElseThrow();
        boolean withdrawn = m.getStatus() == MemberStatus.WITHDRAWN;
        Instant restoreBy = (withdrawn ? m.getWithdrawnAt() : Times.now(clock)).plus(GRACE);
        long posts = count("SELECT count(*) FROM post WHERE author_id = ?", memberId);
        long comments = count("""
                SELECT count(*) FROM comment c JOIN post p ON p.id = c.post_id
                WHERE c.author_id = ? AND p.author_id <> c.author_id AND c.deleted_at IS NULL
                """, memberId);
        long likes = count("SELECT count(*) FROM post_like l JOIN post p ON p.id = l.post_id WHERE p.author_id = ?", memberId);
        return new Summary(m.getHandle(), withdrawn, restoreBy, posts, comments, likes, methodOf(memberId), m.getRole() == Role.ADMIN);
    }

    public record Request(boolean confirmed, String password, String confirmText) {}

    /** 탈퇴 신청 (FR-002·FR-006~FR-009·FR-015). 성공하면 지금 기기를 포함한 모든 세션이 지워진다. */
    public Instant withdraw(long memberId, Request req) {
        if (!req.confirmed()) {
            throw ApiException.validation(List.of(new FieldErrorItem("confirmed", "NOT_CONFIRMED", "안내 내용을 확인해 주세요.")));
        }
        Optional<AuthIdentity> identity = identities.findByMemberId(memberId);
        Method method = identity.filter(i -> i.getProvider() == AuthProvider.LOCAL).isPresent() ? Method.PASSWORD : Method.CONFIRM_TEXT;
        if (members.findById(memberId).map(Member::getRole).orElse(null) == Role.ADMIN) throw adminCannot();
        if (method == Method.PASSWORD) {
            // 비밀번호 변경과 같은 규칙: 5번 연속 틀리면 15분 잠금 (FR-008, docs/11 §6-2)
            String subject = "withdraw:" + memberId;
            if (attempts.isLocked(subject)) throw EmailAccountService.locked(attempts.lockMinutes());
            if (req.password() == null || !encoder.matches(req.password(), identity.get().getPasswordHash())) {
                attempts.recordFailure(subject);
                throw ApiException.validation(List.of(new FieldErrorItem("password", "PASSWORD_WRONG", "비밀번호가 올바르지 않아요.")));
            }
            attempts.reset(subject);
        } else if (req.confirmText() == null || !CONFIRM_TEXT.equals(req.confirmText().strip())) {
            throw ApiException.validation(List.of(new FieldErrorItem("confirmText", "CONFIRM_TEXT_MISMATCH", "\"탈퇴\"를 정확히 입력해 주세요.")));
        }
        Instant now = Times.now(clock);
        String handle = tx.execute(s -> {
            Member m = members.findWithLockById(memberId).orElseThrow();
            if (m.getRole() == Role.ADMIN) throw adminCannot();
            if (m.getStatus() != MemberStatus.ACTIVE) throw ApiException.conflict("ALREADY_WITHDRAWN", "이미 탈퇴 신청한 계정이에요.");
            m.withdraw(now);
            events.publishEvent(new MemberEvents.MemberWithdrawn(memberId, now));
            return m.getHandle();
        });
        sessions.terminate(memberId, null);
        Instant restoreBy = now.plus(GRACE);
        identity.map(AuthIdentity::getEmail).ifPresent(email -> mailer.send(mails.withdrawn(email, handle, DEADLINE.format(restoreBy))));
        return restoreBy;
    }

    /** [복구하기] (FR-017·FR-019). 로그인만으로는 복구하지 않는다. */
    public void restore(long memberId) {
        Instant now = Times.now(clock);
        String handle = tx.execute(s -> {
            Member m = members.findWithLockById(memberId).orElseThrow();
            if (m.getStatus() != MemberStatus.WITHDRAWN || m.getDeletedAt() != null) {
                throw ApiException.conflict("NOT_WITHDRAWN", "탈퇴 신청한 계정이 아니에요.");
            }
            m.restore(now);
            events.publishEvent(new MemberEvents.MemberRestored(memberId, now));
            return m.getHandle();
        });
        identities.findByMemberId(memberId).map(AuthIdentity::getEmail).ifPresent(email -> mailer.send(mails.restored(email, handle)));
    }

    private Method methodOf(long memberId) {
        return identities.findByMemberId(memberId).filter(i -> i.getProvider() == AuthProvider.LOCAL).isPresent()
                ? Method.PASSWORD : Method.CONFIRM_TEXT;
    }

    private long count(String sql, long memberId) {
        Long n = jdbc.queryForObject(sql, Long.class, memberId);
        return n == null ? 0 : n;
    }

    private static ApiException adminCannot() {
        return new ApiException(HttpStatus.CONFLICT, "ADMIN_CANNOT_WITHDRAW", "관리자 권한을 해제한 뒤 탈퇴할 수 있어요.");
    }
}
