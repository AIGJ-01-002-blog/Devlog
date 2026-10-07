package com.team.blog.moderation.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.team.blog.account.domain.Member;
import com.team.blog.account.domain.MemberStatus;
import com.team.blog.account.domain.MemberSuspension;
import com.team.blog.account.domain.Role;
import com.team.blog.account.infra.MemberRepository;
import com.team.blog.account.infra.MemberSuspensionRepository;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.security.SessionTerminator;
import com.team.blog.shared.text.TextCleaner;
import com.team.blog.shared.time.Times;

/**
 * 회원 정지·해제 (019 US4, docs/43 §5). 정지는 이력 행으로 남기고(회원당 열린 정지 하나), 회원 상태를 정지로 바꾼 뒤
 * 커밋되면 그 회원의 모든 세션을 직접 지운다(FR-029, 사건에 맡기지 않음). 콘텐츠는 숨기지 않는다(FR-034).
 * 기한이 지난 정지는 로그인할 때 풀린다(SuspensionService, FR-031).
 */
@Service
public class SuspensionAdminService {
    static final Set<Integer> DAYS = Set.of(1, 7, 30);
    static final int REASON_MAX = 200;

    private final MemberRepository members;
    private final MemberSuspensionRepository suspensions;
    private final SessionTerminator sessions;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public SuspensionAdminService(MemberRepository members, MemberSuspensionRepository suspensions, SessionTerminator sessions,
                                  ApplicationEventPublisher events, Clock clock) {
        this.members = members;
        this.suspensions = suspensions;
        this.sessions = sessions;
        this.events = events;
        this.clock = clock;
    }

    /** @param days 1·7·30, null이면 영구 */
    @Transactional
    public MemberSuspension suspend(long adminId, String handle, Integer days, String rawReason) {
        if (days != null && !DAYS.contains(days)) throw invalid("days", "INVALID_PERIOD", "정지 기간을 골라 주세요.");
        String reason = TextCleaner.cleanMultiline(rawReason);
        if (reason.isEmpty()) throw invalid("reason", "REASON_REQUIRED", "정지 사유를 적어 주세요.");
        if (reason.codePointCount(0, reason.length()) > REASON_MAX) throw invalid("reason", "REASON_TOO_LONG", "사유는 " + REASON_MAX + "자까지 쓸 수 있어요.");
        Member m = target(handle);
        if (m.getId() == adminId || m.getRole() == Role.ADMIN) {
            throw ApiException.badRequest("CANNOT_SUSPEND_ADMIN", "관리자나 자기 자신은 정지할 수 없어요.");
        }
        Instant now = Times.now(clock);
        if (m.getStatus() == MemberStatus.SUSPENDED && suspensions.findFirstByMemberIdAndLiftedAtIsNullOrderByStartedAtDesc(m.getId())
                .filter(s -> !s.isExpired(now)).isPresent()) {
            throw ApiException.conflict("ALREADY_SUSPENDED", "이미 정지된 회원이에요.");
        }
        // 기한이 지났지만 아직 로그인하지 않아 열려 있는 정지는 먼저 닫는다 (열린 정지는 하나)
        suspensions.findFirstByMemberIdAndLiftedAtIsNullOrderByStartedAtDesc(m.getId()).ifPresent(s -> s.lift(now, null));
        if (m.getStatus() == MemberStatus.WITHDRAWN) throw new NotFoundException();
        Instant endsAt = days == null ? null : now.plus(Duration.ofDays(days));
        MemberSuspension s = suspensions.save(MemberSuspension.start(m.getId(), reason, now, endsAt, adminId));
        m.suspend(now);
        long memberId = m.getId();
        afterCommit(() -> sessions.terminate(memberId, null));
        events.publishEvent(new ModerationEvents.MemberSuspended(memberId, endsAt, now));
        return s;
    }

    /** [정지 해제] (FR-032). 열린 정지가 없으면 404. 해제 이력을 남긴다. */
    @Transactional
    public void lift(long adminId, String handle) {
        Member m = target(handle);
        Instant now = Times.now(clock);
        MemberSuspension open = suspensions.findFirstByMemberIdAndLiftedAtIsNullOrderByStartedAtDesc(m.getId())
                .orElseThrow(() -> ApiException.conflict("NOT_SUSPENDED", "정지된 회원이 아니에요."));
        open.lift(now, adminId);
        if (m.getStatus() == MemberStatus.SUSPENDED) m.reactivate(now);
    }

    private Member target(String handle) {
        return members.findByHandle(handle == null ? "" : handle.strip())
                .filter(m -> m.getDeletedAt() == null)
                .orElseThrow(NotFoundException::new);
    }

    private static void afterCommit(Runnable r) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            r.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                r.run();
            }
        });
    }

    private static ApiException invalid(String field, String code, String message) {
        return ApiException.validation(List.of(new FieldErrorItem(field, code, message)));
    }
}
