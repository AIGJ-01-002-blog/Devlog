package com.team.blog.shared.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 인자에 현재 로그인 사용자를 넣는다. required=true인데 비회원이면 401 LOGIN_REQUIRED.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentMember {
    boolean required() default true;
}
