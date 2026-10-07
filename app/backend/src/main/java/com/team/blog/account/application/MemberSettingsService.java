package com.team.blog.account.application;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.team.blog.account.domain.AgreementType;
import com.team.blog.account.domain.AuthIdentity;
import com.team.blog.account.domain.Member;
import com.team.blog.account.domain.Visibility;
import com.team.blog.account.infra.AuthIdentityRepository;
import com.team.blog.account.infra.MemberRepository;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.shared.time.Times;

/** 설정 화면의 계정 영역 (005 US4, docs/11 §6). 블로그 주소·이메일·로그인 수단은 읽기만 한다 (FR-007·FR-022). */
@Service
public class MemberSettingsService {
    private final MemberRepository members;
    private final AuthIdentityRepository identities;
    private final ProfileService profiles;
    private final AgreementService agreements;
    private final Clock clock;

    public MemberSettingsService(MemberRepository members, AuthIdentityRepository identities, ProfileService profiles,
                                 AgreementService agreements, Clock clock) {
        this.members = members;
        this.identities = identities;
        this.profiles = profiles;
        this.agreements = agreements;
        this.clock = clock;
    }

    /**
     * @param previousLogin 이번 로그인 바로 전 로그인. at이 null이면 첫 로그인 (FR-023). 회원당 로그인 수단은 하나라 방식은 지금 수단과 같다
     * @param hasPassword   이메일 가입 계정이면 true. [비밀번호 변경]은 이때만 보인다
     */
    public record Settings(String handle, String nickname, Instant nicknameNextChangeableAt, String bio, String profileImageUrl,
                           String email, boolean emailVerified, String provider, boolean hasPassword,
                           PreviousLogin previousLogin, String defaultVisibility, boolean lastActiveVisible, boolean aiAgreed,
                           Terms terms) {}

    public record PreviousLogin(Instant at, String provider) {}

    public record Terms(String termsVersion, String termsEffectiveDate, String privacyVersion, String privacyEffectiveDate) {}

    @Transactional(readOnly = true)
    public Settings of(MemberPrincipal me) {
        Member m = members.findById(me.id()).orElseThrow();
        AuthIdentity identity = identities.findByMemberId(me.id()).orElse(null);
        ProfileService.Profile p = profiles.current(me.id());
        BlogProperties.Agreements t = agreements.current();
        return new Settings(m.getHandle(), p.nickname(), p.nicknameNextChangeableAt(), p.bio(), p.profileImageUrl(),
                identity == null ? null : identity.getEmail(), identity != null && identity.isEmailVerified(),
                me.provider(), identity != null && identity.getPasswordHash() != null,
                new PreviousLogin(me.previousLoginAt(), me.provider()), m.getDefaultVisibility().name(), m.isLastActiveVisible(),
                agreements.hasAgreed(me.id(), AgreementType.AI),
                new Terms(t.termsVersion(), t.termsEffectiveDate(), t.privacyVersion(), t.privacyEffectiveDate()));
    }

    @Transactional
    public void changeDefaultVisibility(long memberId, Visibility visibility) {
        Member m = members.findById(memberId).orElseThrow();
        if (m.getDefaultVisibility() != visibility) m.changeDefaultVisibility(visibility, Times.now(clock));
    }

    /** 최근 활동을 친구에게 보이기 (008 FR-012). 끄면 나도 친구들의 최근 활동을 못 본다. */
    @Transactional
    public void changeLastActiveVisible(long memberId, boolean visible) {
        Member m = members.findById(memberId).orElseThrow();
        if (m.isLastActiveVisible() != visible) m.changeLastActiveVisible(visible, Times.now(clock));
    }
}
