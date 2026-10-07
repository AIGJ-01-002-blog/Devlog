package com.team.blog.telegram.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.team.blog.notification.application.NotificationCreated;
import com.team.blog.notification.application.NotificationQuery;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.telegram.infra.TelegramApi;

/**
 * 새 블로그 알림을 연결된 텔레그램으로도 보낸다 (023 US2). 알림이 커밋된 뒤 따로 보내고(FR-004),
 * 화면 알림과 같은 판정으로 문구를 만든다(FR-005). 봇이 차단됐으면 연결을 지운다.
 */
@Component
class TelegramNotifier {
    private static final Logger log = LoggerFactory.getLogger(TelegramNotifier.class);

    private final TelegramProperties props;
    private final TelegramLinks links;
    private final NotificationQuery notifications;
    private final TelegramApi api;
    private final String baseUrl;

    TelegramNotifier(TelegramProperties props, TelegramLinks links, NotificationQuery notifications, TelegramApi api,
                     BlogProperties blog) {
        this.props = props;
        this.links = links;
        this.notifications = notifications;
        this.api = api;
        String b = blog.site().baseUrl() == null ? "" : blog.site().baseUrl();
        this.baseUrl = b.endsWith("/") ? b.substring(0, b.length() - 1) : b;
    }

    @Async(TelegramConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(NotificationCreated e) {
        if (!props.available()) return;
        try {
            links.chatOf(e.receiverId()).filter(TelegramLinks.Linked::notifications).ifPresent(chat ->
                    notifications.find(e.receiverId(), e.notificationId())
                            .map(item -> TelegramMessages.notification(item, baseUrl))
                            .ifPresent(text -> {
                                if (api.send(chat.chatId(), text) == TelegramApi.SendResult.GONE) links.unlinkChat(chat.chatId());
                            }));
        } catch (RuntimeException ex) {
            log.warn("텔레그램 알림을 보내지 못했습니다 (알림 {}): {}", e.notificationId(), ex.getClass().getSimpleName());
        }
    }
}
