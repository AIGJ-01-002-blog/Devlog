package com.team.blog.shared.security;

import java.io.Serial;
import java.util.List;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public class MemberAuthentication extends AbstractAuthenticationToken {
    @Serial
    private static final long serialVersionUID = 1L;
    private final MemberPrincipal principal;

    public MemberAuthentication(MemberPrincipal principal) {
        super(List.of(new SimpleGrantedAuthority("ROLE_" + principal.role())));
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return "";
    }

    @Override
    public MemberPrincipal getPrincipal() {
        return principal;
    }

    @Override
    public String getName() {
        return String.valueOf(principal.id());
    }
}
