package com.team.blog.config;

import java.util.List;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.session.web.http.SessionRepositoryFilter;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.team.blog.shared.security.CurrentMemberArgumentResolver;
import com.team.blog.shared.security.ResilientSessionFilter;

@Configuration
@EnableScheduling
public class WebConfig implements WebMvcConfigurer {
    private final CurrentMemberArgumentResolver currentMemberResolver;

    public WebConfig(CurrentMemberArgumentResolver currentMemberResolver) {
        this.currentMemberResolver = currentMemberResolver;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentMemberResolver);
    }

    /** Spring Session 필터 바로 뒤: 세션 저장소 장애 시 비로그인 처리. */
    @Bean
    FilterRegistrationBean<ResilientSessionFilter> resilientSessionFilter() {
        FilterRegistrationBean<ResilientSessionFilter> reg = new FilterRegistrationBean<>(new ResilientSessionFilter());
        reg.setOrder(SessionRepositoryFilter.DEFAULT_ORDER + 1);
        return reg;
    }
}
