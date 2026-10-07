package com.team.blog.account.application;

import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.team.blog.account.domain.Member;
import com.team.blog.account.domain.MemberStatus;
import com.team.blog.account.domain.MemberSuspension;
import com.team.blog.account.infra.MemberSuspensionRepository;

/**
 * 정지 판정 (docs/07 §6). 열린 정지의 기한이 지났으면 해제 기록을 남기고 정상 상태로 돌린다.
 */
@Service
public class SuspensionService {
    private final MemberSuspensionRepository suspensions;

    public SuspensionService(MemberSuspensionRepository suspensions) {
        this.suspensions = suspensions;
    }

    /** @return 아직 유효한 정지. 없거나 기한이 지나 풀렸으면 empty */
    @Transactional
    public Optional<MemberSuspension> activeSuspension(Member member, Instant now) {
        if (member.getStatus() != MemberStatus.SUSPENDED) return Optional.empty();
        Optional<MemberSuspension> open = suspensions.findFirstByMemberIdAndLiftedAtIsNullOrderByStartedAtDesc(member.getId());
        if (open.isEmpty()) {
            member.reactivate(now);
            return Optional.empty();
        }
        if (open.get().isExpired(now)) {
            open.get().lift(now, null);
            member.reactivate(now);
            return Optional.empty();
        }
        return open;
    }
}
