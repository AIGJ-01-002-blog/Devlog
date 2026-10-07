package com.team.blog.account.application;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.account.domain.AuthIdentity;
import com.team.blog.account.domain.AuthProvider;
import com.team.blog.account.domain.Member;
import com.team.blog.account.infra.AuthIdentityRepository;
import com.team.blog.account.infra.MemberRepository;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.shared.time.Times;

/**
 * 소셜 가입 마무리 (docs/07 §5, 001 US1). 회원·로그인 수단·약관 동의를 한 트랜잭션으로 만든다.
 * 동시에 같은 주소·닉네임으로 가입하면 DB UNIQUE가 한 명만 통과시키고, 늦은 쪽은 409 + 새 제안을 받는다.
 */
@Service
public class SignupService {
    private final MemberRepository members;
    private final AuthIdentityRepository identities;
    private final AgreementService agreements;
    private final HandlePolicy handlePolicy;
    private final HandleSuggester suggester;
    private final NicknamePolicy nicknamePolicy;
    private final SocialLoginService loginService;
    private final TransactionTemplate tx;
    private final Clock clock;

    public SignupService(MemberRepository members, AuthIdentityRepository identities, AgreementService agreements,
                         HandlePolicy handlePolicy, HandleSuggester suggester, NicknamePolicy nicknamePolicy,
                         SocialLoginService loginService, TransactionTemplate tx, Clock clock) {
        this.members = members;
        this.identities = identities;
        this.agreements = agreements;
        this.handlePolicy = handlePolicy;
        this.suggester = suggester;
        this.nicknamePolicy = nicknamePolicy;
        this.loginService = loginService;
        this.tx = tx;
        this.clock = clock;
    }

    public record SignupForm(String handleBody, String nickname, boolean agreeTerms, boolean agreePrivacy) {}

    /** 가입 마무리 화면의 미리 채우는 값. */
    public record SignupDraft(AuthProvider provider, String prefix, String handleBody, String nickname,
                              String email, String avatarUrl) {}

    public SignupDraft draftFor(PendingSignup pending) {
        SocialProfile p = pending.profile();
        String material = p.provider() == AuthProvider.GITHUB ? p.login() : localPart(p.verifiedEmail());
        String handle = suggester.suggest(p.provider(), material);
        String nickname = nicknamePolicy.prefill(p.name() != null && !p.name().isBlank() ? p.name() : p.login());
        return new SignupDraft(p.provider(), p.provider().handlePrefix(), HandlePolicy.bodyOf(handle), nickname,
                p.verifiedEmail(), p.avatarUrl());
    }

    public MemberPrincipal complete(PendingSignup pending, SignupForm form) {
        SocialProfile profile = pending.profile();
        String body = form.handleBody() == null ? "" : form.handleBody().strip().toLowerCase(java.util.Locale.ROOT);
        String nickname = NicknamePolicy.normalize(form.nickname());

        List<FieldErrorItem> errors = new ArrayList<>();
        HandlePolicy.Reason handleReason = handlePolicy.checkBody(profile.provider(), body);
        if (handleReason != null) errors.add(new FieldErrorItem("handleBody", "HANDLE_" + handleReason.name(), handleReason.message()));
        NicknamePolicy.Code nickCode = nicknamePolicy.checkRules(nickname);
        if (nickCode != null) errors.add(new FieldErrorItem("nickname", nickCode.name(), nickCode.message()));
        if (!form.agreeTerms()) errors.add(new FieldErrorItem("agreeTerms", "AGREEMENT_REQUIRED", "이용약관에 동의해 주세요."));
        if (!form.agreePrivacy()) errors.add(new FieldErrorItem("agreePrivacy", "AGREEMENT_REQUIRED", "개인정보 처리방침에 동의해 주세요."));
        if (!errors.isEmpty()) throw ApiException.validation(errors);

        String handle = profile.provider().handlePrefix() + body;
        try {
            return tx.execute(status -> create(profile, handle, nickname));
        } catch (DataIntegrityViolationException e) {
            String msg = String.valueOf(e.getMostSpecificCause().getMessage());
            if (msg.contains("uq_auth_identity")) {
                // 같은 소셜 계정으로 두 번 제출: 이미 만들어진 계정으로 로그인한다 (계정은 하나뿐)
                return tx.execute(status -> loggedInExisting(profile));
            }
            if (msg.contains("uq_member_handle")) {
                String suggestion = suggester.firstFree(profile.provider(), body);
                throw new ApiException(HttpStatus.CONFLICT, "HANDLE_TAKEN",
                        "방금 다른 분이 이 주소를 사용했어요. " + suggestion + "는 어떠세요?", List.of(),
                        Map.of("suggestion", HandlePolicy.bodyOf(suggestion)));
            }
            if (msg.contains("uq_member_nickname")) {
                throw ApiException.conflict("NICKNAME_TAKEN", "방금 다른 분이 이 닉네임을 사용했어요.");
            }
            throw e;
        }
    }

    private MemberPrincipal create(SocialProfile profile, String handle, String nickname) {
        Instant now = Times.now(clock);
        Member member = members.saveAndFlush(Member.join(handle, nickname, now));
        AuthIdentity identity = identities.saveAndFlush(
                AuthIdentity.social(member.getId(), profile.provider(), profile.providerUserId(), profile.verifiedEmail(), now));
        agreements.recordSignup(member.getId(), now);
        identity.recordLogin(now);
        return new MemberPrincipal(member.getId(), handle, member.getRole().name(), profile.provider().name(), false, null);
    }

    private MemberPrincipal loggedInExisting(SocialProfile profile) {
        AuthIdentity identity = identities.findByProviderAndProviderUserId(profile.provider(), profile.providerUserId()).orElseThrow();
        LoginOutcome outcome = loginService.login(identity, Times.now(clock));
        if (outcome instanceof LoginOutcome.LoggedIn in) return in.principal();
        throw ApiException.conflict("SIGNUP_FAILED", "로그인할 수 없는 계정이에요.");
    }

    private static String localPart(String email) {
        if (email == null) return "";
        int at = email.indexOf('@');
        return at < 0 ? email : email.substring(0, at);
    }
}
