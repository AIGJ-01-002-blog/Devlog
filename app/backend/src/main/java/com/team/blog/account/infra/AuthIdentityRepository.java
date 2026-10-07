package com.team.blog.account.infra;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.team.blog.account.domain.AuthIdentity;
import com.team.blog.account.domain.AuthProvider;

public interface AuthIdentityRepository extends JpaRepository<AuthIdentity, Long> {
    Optional<AuthIdentity> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);

    Optional<AuthIdentity> findByMemberId(long memberId);

    List<AuthIdentity> findByEmail(String email);
}
