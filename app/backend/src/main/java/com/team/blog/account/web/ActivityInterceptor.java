package com.team.blog.account.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.team.blog.account.application.ActivityTracker;
import com.team.blog.shared.security.CurrentMemberArgumentResolver;
import com.team.blog.shared.security.MemberPrincipal;

/** 로그인한 요청이 오면 최근 활동을 남긴다 (008 FR-007). 정지 회원은 AccountStateFilter가 비회원으로 바꿔 여기 오지 않는다. */
@Component
public class ActivityInterceptor implements HandlerInterceptor {
    private final ActivityTracker tracker;

    public ActivityInterceptor(ActivityTracker tracker) {
        this.tracker = tracker;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        MemberPrincipal me = CurrentMemberArgumentResolver.current();
        if (me != null) tracker.touch(me.id());
        return true;
    }
}
