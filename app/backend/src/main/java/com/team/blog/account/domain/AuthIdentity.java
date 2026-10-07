package com.team.blog.account.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 로그인 수단. 회원 하나에 하나 (docs/07 L-1, UNIQUE(member_id)). 소셜은 고유 ID로 식별한다. */
@Entity
@Table(name = "auth_identity")
public class AuthIdentity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private AuthProvider provider;

    @Column(nullable = false, updatable = false)
    private String providerUserId;

    private String email;
    private String passwordHash;
    private Instant emailVerifiedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant lastLoginAt;

    protected AuthIdentity() {}

    public static AuthIdentity social(long memberId, AuthProvider provider, String providerUserId, String email, Instant now) {
        AuthIdentity a = new AuthIdentity();
        a.memberId = memberId;
        a.provider = provider;
        a.providerUserId = providerUserId;
        a.email = email;
        a.emailVerifiedAt = now; // 소셜 가입은 가입 시각으로 인증된 것으로 본다 (docs/07 §5)
        a.createdAt = now;
        return a;
    }

    public static AuthIdentity local(long memberId, String email, String passwordHash, Instant now) {
        AuthIdentity a = new AuthIdentity();
        a.memberId = memberId;
        a.provider = AuthProvider.LOCAL;
        a.providerUserId = email;
        a.email = email;
        a.passwordHash = passwordHash;
        a.createdAt = now;
        return a;
    }

    /** @return 갱신하기 전의 마지막 로그인 시각 (docs/07 §6 "직전 로그인") */
    public Instant recordLogin(Instant now) {
        Instant previous = lastLoginAt;
        lastLoginAt = now;
        return previous;
    }

    public void markEmailVerified(Instant now) {
        if (emailVerifiedAt == null) emailVerifiedAt = now;
    }

    public void changePasswordHash(String hash) {
        this.passwordHash = hash;
    }

    public void updateEmail(String email) {
        this.email = email;
    }

    public Long getId() { return id; }
    public Long getMemberId() { return memberId; }
    public AuthProvider getProvider() { return provider; }
    public String getProviderUserId() { return providerUserId; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public Instant getEmailVerifiedAt() { return emailVerifiedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastLoginAt() { return lastLoginAt; }
}
