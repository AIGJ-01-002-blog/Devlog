package com.team.blog.discord.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.team.blog.discord.infra.DiscordApi;
import com.team.blog.notification.application.NotificationCreated;
import com.team.blog.notification.application.NotificationQuery;
import com.team.blog.notification.application.NotificationText;
import com.team.blog.shared.config.BlogProperties;

/** 새 블로그 알림을 연결된 디스코드 채널로도 보낸다 (078). 텔레그램(023)과 같이 커밋 뒤 따로 보내고 같은 문구를 쓴다. */
@Component
class DiscordNotifier {
    private static final Logger log = LoggerFactory.getLogger(DiscordNotifier.class);

    private final DiscordLinks links;
    private final NotificationQuery notifications;
    private final DiscordApi api;
    private final String baseUrl;

    DiscordNotifier(DiscordLinks links, NotificationQuery notifications, DiscordApi api, BlogProperties blog) {
        this.links = links;
        this.notifications = notifications;
        this.api = api;
        String b = blog.site().baseUrl() == null ? "" : blog.site().baseUrl();
        this.baseUrl = b.endsWith("/") ? b.substring(0, b.length() - 1) : b;
    }

    @Async(DiscordConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(NotificationCreated e) {
        if (!links.enabled()) return;
        try {
            links.target(e.receiverId()).filter(DiscordLinks.Target::notifications).ifPresent(t ->
                    notifications.find(e.receiverId(), e.notificationId())
                            .map(item -> NotificationText.of(item, baseUrl))
                            .ifPresent(text -> {
                                if (api.send(t.webhook(), text) == DiscordApi.Result.GONE) links.forget(e.receiverId(), t.webhook());
                            }));
        } catch (RuntimeException ex) {
            log.warn("디스코드 알림을 보내지 못했습니다 (알림 {}): {}", e.notificationId(), ex.getClass().getSimpleName());
        }
    }
}
