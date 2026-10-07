package com.team.blog.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.session.web.http.SessionRepositoryFilter;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.team.blog.account.web.ActivityInterceptor;
import com.team.blog.shared.security.CurrentMemberArgumentResolver;
import com.team.blog.shared.security.ResilientSessionFilter;

@Configuration
@EnableScheduling
public class WebConfig implements WebMvcConfigurer {
    private final CurrentMemberArgumentResolver currentMemberResolver;
    private final ActivityInterceptor activityInterceptor;

    public WebConfig(CurrentMemberArgumentResolver currentMemberResolver, ActivityInterceptor activityInterceptor) {
        this.currentMemberResolver = currentMemberResolver;
        this.activityInterceptor = activityInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(activityInterceptor).excludePathPatterns("/assets/**", "/media/**", "/actuator/**");
    }

    /**
     * 화면 빌드 결과(/assets)는 파일 이름에 내용 해시가 붙어 내용이 바뀌면 이름도 바뀐다. 그래서 한 번 받은 파일은
     * 1년 동안 다시 묻지 않게 한다. 이 설정이 없으면 Spring Security 기본값(no-store)이 붙어 화면을 열 때마다
     * JS·CSS를 모두 다시 받았다. index.html과 이름이 고정된 파일(theme.js, favicon)은 지금처럼 매번 확인한다.
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
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
