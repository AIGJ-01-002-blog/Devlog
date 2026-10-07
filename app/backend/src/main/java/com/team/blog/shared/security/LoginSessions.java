package com.team.blog.shared.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

/**
 * 로그인 상태를 세션에 세우고 지운다. 로그인할 때 세션 ID를 새로 발급해 세션 고정을 막는다 (docs/07 §6).
 */
@Component
public class LoginSessions {
    private final SecurityContextRepository repository = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    public void login(HttpServletRequest request, HttpServletResponse response, MemberPrincipal principal) {
        if (request.getSession(false) != null) request.changeSessionId();
        else request.getSession(true);
        SecurityContext context = holder.createEmptyContext();
        context.setAuthentication(new MemberAuthentication(principal));
        holder.setContext(context);
        repository.saveContext(context, request, response);
    }

    /** 세션 안의 사용자 정보만 바꾼다 (재동의 직후 등). */
    public void refresh(HttpServletRequest request, HttpServletResponse response, MemberPrincipal principal) {
        SecurityContext context = holder.createEmptyContext();
        context.setAuthentication(new MemberAuthentication(principal));
        holder.setContext(context);
        repository.saveContext(context, request, response);
    }

    /** 인증만 지우고 세션은 남긴다 (소셜 인증 직후 가입 대기 상태로 바꿀 때). */
    public void clearAuthentication(HttpServletRequest request, HttpServletResponse response) {
        SecurityContext empty = holder.createEmptyContext();
        holder.setContext(empty);
        repository.saveContext(empty, request, response);
    }
}
