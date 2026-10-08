package com.team.blog.account.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.team.blog.account.domain.Member;
import com.team.blog.account.domain.MemberStatus;
import com.team.blog.account.domain.Role;
import com.team.blog.account.infra.MemberRepository;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.security.SessionTerminator;
import com.team.blog.shared.time.Times;

/**
 * 권한 주기 (062). 관리자는 운영자 계정 하나다: 실행 설정 `OWNER_HANDLE`(블로그 주소, 바뀌지 않음)이나 `OWNER_GITHUB_ID`
 * (GitHub 회원 번호)에 맞는 계정을 앱이 뜰 때 관리자로 올린다. 둘 다 비밀값이 아니다. 화면에서는 관리자만 다른 회원을 매니저로 올리거나 일반 회원으로 내릴 수 있고, 관리자 권한은 줄 수 없다.
 * 세션에 권한이 담겨 있으므로 바꾸면 그 회원의 모든 로그인을 끊어 다시 로그인할 때 새 권한을 받게 한다.
 */
@Service
public class RoleService {
    private static final Logger log = LoggerFactory.getLogger(RoleService.class);

    private final MemberRepository members;
    private final JdbcTemplate jdbc;
    private final SessionTerminator sessions;
    private final Clock clock;
    private final String ownerGithubId;
    private final String ownerHandle;

    public RoleService(MemberRepository members, JdbcTemplate jdbc, SessionTerminator sessions, Clock clock,
                       @Value("${blog.owner.github-id:}") String ownerGithubId, @Value("${blog.owner.handle:}") String ownerHandle) {
        this.members = members;
        this.jdbc = jdbc;
        this.sessions = sessions;
        this.clock = clock;
        this.ownerGithubId = ownerGithubId == null ? "" : ownerGithubId.strip();
        String h = ownerHandle == null ? "" : ownerHandle.strip();
        this.ownerHandle = h.startsWith("@") ? h.substring(1) : h;
    }

    /** 관리자 화면에서 고를 수 있는 권한. 관리자(ADMIN)는 고를 수 없다. */
    static final List<Role> GRANTABLE = List.of(Role.USER, Role.MANAGER);

    @Transactional
    public Role change(long actorId, String handle, String rawRole) {
        Member actor = members.findById(actorId).orElseThrow(NotFoundException::new);
        if (actor.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_ONLY", "권한은 관리자만 바꿀 수 있어요.");
        }
        Role role = parse(rawRole);
        Member target = members.findByHandle(handle == null ? "" : handle.strip())
                .filter(m -> m.getDeletedAt() == null)
                .orElseThrow(NotFoundException::new);
        if (target.getId() == actorId) throw ApiException.badRequest("CANNOT_CHANGE_OWN_ROLE", "자기 권한은 바꿀 수 없어요.");
        if (isOwner(target.getId())) throw ApiException.badRequest("CANNOT_CHANGE_OWNER", "운영자 계정의 권한은 바꿀 수 없어요.");
        if (role == Role.MANAGER && target.getStatus() != MemberStatus.ACTIVE) {
            throw ApiException.conflict("MEMBER_NOT_ACTIVE", "정지되었거나 탈퇴 신청한 회원은 매니저로 올릴 수 없어요.");
        }
        if (target.getRole() == role) return role;
        target.changeRole(role, Times.now(clock));
        long id = target.getId();
        afterCommit(() -> sessions.terminate(id, null));
        log.info("회원 {}의 권한을 {}로 바꿨습니다 (바꾼 사람 {})", id, role, actorId);
        return role;
    }

    /** 운영자 계정을 관리자로 올린다. 이미 관리자면 아무것도 하지 않는다. 운영자가 아직 가입하지 않았으면 가입한 뒤 다음 배포에서 올라간다. */
    @EventListener(ApplicationReadyEvent.class)
    public void promoteOwner() {
        if (ownerGithubId.isEmpty() && ownerHandle.isEmpty()) return;
        try {
            List<Long> ids = jdbc.queryForList("""
                    UPDATE member SET role = 'ADMIN', updated_at = ?
                    WHERE (handle = ? OR id IN (SELECT member_id FROM auth_identity WHERE provider = 'GITHUB' AND provider_user_id = ?))
                      AND role <> 'ADMIN' AND deleted_at IS NULL
                    RETURNING id
                    """, Long.class, Timestamp.from(Times.now(clock)), ownerHandle, ownerGithubId);
            for (long id : ids) {
                sessions.terminate(id, null);
                log.info("운영자 계정(회원 {})을 관리자로 올렸습니다", id);
            }
        } catch (RuntimeException e) {
            // 관리자 지정이 실패해도 앱은 뜬다 (다음 배포에서 다시 시도)
            log.warn("운영자 계정을 관리자로 올리지 못했습니다: {}", e.getClass().getSimpleName());
        }
    }

    private boolean isOwner(long memberId) {
        if (ownerGithubId.isEmpty() && ownerHandle.isEmpty()) return false;
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM member m WHERE m.id = ? AND (m.handle = ? OR EXISTS (
                    SELECT 1 FROM auth_identity a WHERE a.member_id = m.id AND a.provider = 'GITHUB' AND a.provider_user_id = ?)))
                """, Boolean.class, memberId, ownerHandle, ownerGithubId));
    }

    private static Role parse(String raw) {
        try {
            Role r = Role.valueOf(raw == null ? "" : raw.strip().toUpperCase(Locale.ROOT));
            if (GRANTABLE.contains(r)) return r;
        } catch (IllegalArgumentException ignored) {
            // 아래에서 안내
        }
        throw ApiException.validation(List.of(new FieldErrorItem("role", "INVALID_ROLE", "일반 회원이나 매니저 중에서 골라 주세요.")));
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
}
