package com.team.blog.account.infra;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.team.blog.account.domain.MemberSuspension;

public interface MemberSuspensionRepository extends JpaRepository<MemberSuspension, Long> {
    Optional<MemberSuspension> findFirstByMemberIdAndLiftedAtIsNullOrderByStartedAtDesc(long memberId);

    List<MemberSuspension> findByMemberIdOrderByStartedAtDesc(long memberId);
}
