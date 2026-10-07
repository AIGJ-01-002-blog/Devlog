package com.team.blog.account.infra;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.team.blog.account.domain.MemberAgreement;

public interface MemberAgreementRepository extends JpaRepository<MemberAgreement, MemberAgreement.Key> {
    @Query("select a from MemberAgreement a where a.id.memberId = :memberId")
    List<MemberAgreement> findAllByMemberId(@Param("memberId") long memberId);
}
