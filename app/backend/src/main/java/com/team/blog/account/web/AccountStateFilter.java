package com.team.blog.account.web;

import java.io.IOException;
import java.util.Set;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import tools.jackson.databind.json.JsonMapper;

import com.team.blog.account.domain.MemberStatus;
import com.team.blog.account.infra.MemberRepository;
import com.team.blog.shared.error.ErrorResponse;
import com.team.blog.shared.security.CurrentMemberArgumentResolver;
import com.team.blog.shared.security.MemberPrincipal;

/**
 * 로그인한 사용자의 계정 상태 판정 (docs/42 §3 ②). 세션 값이 아니라 DB의 현재 상태로 판단해
 * 정지·탈퇴가 남아 있는 세션에도 바로 적용되게 한다.
 * <ul>
 *   <li>정지: 쓰기 요청은 403 ACCOUNT_SUSPENDED, 읽기는 비회원으로 처리 (P-7)</li>
 *   <li>탈퇴 유예: 복구·로그아웃 외에는 403 ACCOUNT_WITHDRAWN (P-12)</li>
 *   <li>약관 재동의 필요: 동의·로그아웃 외에는 403 AGREEMENT_REQUIRED (docs/07 §3-1)</li>
 * </ul>
 */
public class AccountStateFilter extends OncePerRequestFilter {
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private static final Set<String> ALWAYS_ALLOWED = Set.of("/api/auth/me", "/api/auth/logout", "/api/terms/current");
    private static final Set<String> RECONSENT_ALLOWED = Set.of("/api/auth/agreements");
    private static final Set<String> WITHDRAWN_ALLOWED = Set.of("/api/me/restore", "/api/me/withdrawal");

    private final MemberRepository members;
    private final JsonMapper json = JsonMapper.builder().build();

    public AccountStateFilter(MemberRepository members) {
        this.members = members;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        MemberPrincipal principal = CurrentMemberArgumentResolver.current();
        if (principal == null) {
            chain.doFilter(request, response);
            return;
        }
        String path = request.getRequestURI();
        MemberStatus status = members.findById(principal.id()).map(m -> m.getStatus()).orElse(null);
        if (status == null) {
            SecurityContextHolder.clearContext();
            chain.doFilter(request, response);
            return;
        }
        boolean safe = SAFE_METHODS.contains(request.getMethod());
        if (status == MemberStatus.SUSPENDED) {
            if (!safe && !path.equals("/api/auth/logout")) {
                deny(response, HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "정지된 계정이에요.");
                return;
            }
            if (!ALWAYS_ALLOWED.contains(path)) SecurityContextHolder.clearContext();
            chain.doFilter(request, response);
            return;
        }
        if (status == MemberStatus.WITHDRAWN && !ALWAYS_ALLOWED.contains(path) && !WITHDRAWN_ALLOWED.contains(path)) {
            deny(response, HttpStatus.FORBIDDEN, "ACCOUNT_WITHDRAWN", "탈퇴 신청한 계정이에요. 복구하면 다시 이용할 수 있어요.");
            return;
        }
        if (principal.agreementRequired() && !ALWAYS_ALLOWED.contains(path) && !RECONSENT_ALLOWED.contains(path)) {
            deny(response, HttpStatus.FORBIDDEN, "AGREEMENT_REQUIRED", "바뀐 약관에 동의해 주세요.");
            return;
        }
        chain.doFilter(request, response);
    }

    private void deny(HttpServletResponse response, HttpStatus status, String code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(json.writeValueAsString(ErrorResponse.of(code, message)));
    }
}
