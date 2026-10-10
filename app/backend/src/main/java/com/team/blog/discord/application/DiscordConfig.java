package com.team.blog.discord.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** 디스코드 보내기 실행기 (078). 텔레그램처럼 외부 호출이 블로그 알림 처리를 붙잡지 않게 따로 둔다. */
@Configuration
class DiscordConfig {
    private static final Logger log = LoggerFactory.getLogger(DiscordConfig.class);
    static final String EXECUTOR = "discordExecutor";

    @Bean(EXECUTOR)
    TaskExecutor discordExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setThreadNamePrefix("discord-");
        ex.setCorePoolSize(2);
        ex.setMaxPoolSize(2);
        ex.setQueueCapacity(500);
        ex.setRejectedExecutionHandler((task, pool) -> log.warn("디스코드 대기열이 넘쳐 메시지 하나를 버립니다"));
        ex.setWaitForTasksToCompleteOnShutdown(true);
        ex.setAwaitTerminationSeconds(10);
        ex.initialize();
        return ex;
    }
}
