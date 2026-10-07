package com.team.blog.telegram.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** 텔레그램 보내기 실행기 (023 FR-004). 외부 호출이 느려도 블로그 알림 처리(notify-)를 붙잡지 않게 따로 둔다. */
@Configuration
class TelegramConfig {
    private static final Logger log = LoggerFactory.getLogger(TelegramConfig.class);
    static final String EXECUTOR = "telegramExecutor";

    @Bean(EXECUTOR)
    TaskExecutor telegramExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setThreadNamePrefix("telegram-");
        ex.setCorePoolSize(2);
        ex.setMaxPoolSize(2);
        ex.setQueueCapacity(500);
        ex.setRejectedExecutionHandler((task, pool) -> log.warn("텔레그램 대기열이 넘쳐 메시지 하나를 버립니다"));
        ex.setWaitForTasksToCompleteOnShutdown(true);
        ex.setAwaitTerminationSeconds(10);
        ex.initialize();
        return ex;
    }
}
