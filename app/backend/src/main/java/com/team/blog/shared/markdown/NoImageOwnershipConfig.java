package com.team.blog.shared.markdown;

import java.util.Collection;
import java.util.Set;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** 사진 모듈이 없을 때의 기본값: 어떤 사진도 작성자 것이 아니다(모두 링크로). */
@Configuration
class NoImageOwnershipConfig {
    @Bean
    @ConditionalOnMissingBean(ImageOwnership.class)
    ImageOwnership noImageOwnership() {
        return (uploaderId, keys) -> Set.of();
    }
}
