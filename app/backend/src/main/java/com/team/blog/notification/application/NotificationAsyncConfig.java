package com.team.blog.notification.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 알림 처리 실행기 (015 FR-041·FR-042, docs/20 EV-5). 원래 요청과 떼어 커밋 뒤 따로 처리한다.
 * 대기열이 넘치면 버리고 경고를 남기며, 서버가 꺼질 때는 최대 20초 동안 남은 처리를 끝낸다(유실 허용).
 * 시험에서는 {@code blog.notification.async=false}로 같은 스레드에서 바로 처리해 결과를 기다리지 않게 한다.
 */
@Configuration
@EnableAsync
class NotificationAsyncConfig {
    private static final Logger log = LoggerFactory.getLogger(NotificationAsyncConfig.class);
    static final String EXECUTOR = "notificationExecutor";

    @Bean(EXECUTOR)
    TaskExecutor notificationExecutor(@Value("${blog.notification.async:true}") boolean async,
                                      @Value("${blog.notification.queue-capacity:1000}") int capacity) {
        if (!async) return new SyncTaskExecutor();
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setThreadNamePrefix("notify-");
        ex.setCorePoolSize(2);
        ex.setMaxPoolSize(2);
        ex.setQueueCapacity(capacity);
        ex.setRejectedExecutionHandler((task, pool) -> log.warn("알림 대기열이 넘쳐 알림 하나를 버립니다 (대기 {}개)", pool.getQueue().size()));
        ex.setWaitForTasksToCompleteOnShutdown(true);
        ex.setAwaitTerminationSeconds(20);
        ex.initialize();
        return ex;
    }
}
