package com.team.blog.account.domain;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/** 약관·처리방침·AI 동의 (docs/07 §3-1). 회원·종류마다 한 행, 다시 동의하면 버전·일자를 바꾼다. */
@Entity
@Table(name = "member_agreement")
public class MemberAgreement {
    @EmbeddedId
    private Key id;

    @Column(nullable = false)
    private String version;

    @Column(nullable = false)
    private Instant agreedAt;

    protected MemberAgreement() {}

    public MemberAgreement(long memberId, AgreementType type, String version, Instant now) {
        this.id = new Key(memberId, type);
        this.version = version;
        this.agreedAt = now;
    }

    public void agree(String version, Instant now) {
        this.version = version;
        this.agreedAt = now;
    }

    public AgreementType type() { return id.type; }
    public String getVersion() { return version; }
    public Instant getAgreedAt() { return agreedAt; }

    @Embeddable
    public static class Key implements Serializable {
        @Column(name = "member_id")
        private Long memberId;

        @Enumerated(EnumType.STRING)
        @Column(name = "type")
        private AgreementType type;

        protected Key() {}

        public Key(long memberId, AgreementType type) {
            this.memberId = memberId;
            this.type = type;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Key k && Objects.equals(memberId, k.memberId) && type == k.type;
        }

        @Override
        public int hashCode() {
            return Objects.hash(memberId, type);
        }
    }
}
