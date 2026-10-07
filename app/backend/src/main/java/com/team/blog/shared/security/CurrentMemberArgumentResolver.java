package com.team.blog.shared.security;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import com.team.blog.shared.error.ApiException;

@Component
public class CurrentMemberArgumentResolver implements HandlerMethodArgumentResolver {
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentMember.class)
                && MemberPrincipal.class.equals(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav, NativeWebRequest request,
                                  WebDataBinderFactory binderFactory) {
        MemberPrincipal principal = current();
        CurrentMember ann = parameter.getParameterAnnotation(CurrentMember.class);
        if (principal == null && ann != null && ann.required()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "LOGIN_REQUIRED", "로그인이 필요해요.");
        }
        return principal;
    }

    public static MemberPrincipal current() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof MemberAuthentication ma) return ma.getPrincipal();
        return null;
    }
}
