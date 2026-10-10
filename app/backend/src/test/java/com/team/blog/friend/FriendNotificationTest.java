package com.team.blog.friend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import tools.jackson.databind.JsonNode;

import com.team.blog.notification.application.NotificationService;
import com.team.blog.support.IntegrationTest;

/** 친구 요청·수락 알림 (015 A-1). 거절·취소·끊기는 알리지 않고, 같은 사람의 요청은 7일에 한 번이다. */
class FriendNotificationTest extends IntegrationTest {
    @Autowired NotificationService notifications;

    void request(Session from, Session to) throws Exception {
        from.http().perform(put("/api/me/friends/" + to.handle()).with(csrf())).andExpect(status().isOk());
    }

    void accept(Session me, Session requester) throws Exception {
        me.http().perform(post("/api/me/friends/" + requester.handle() + "/accept").with(csrf())).andExpect(status().isOk());
    }

    void remove(Session me, Session other) throws Exception {
        me.http().perform(delete("/api/me/friends/" + other.handle()).with(csrf())).andExpect(status().isNoContent());
    }

    JsonNode notifications(Session s) throws Exception {
        drain();
        return read(s.http().perform(get("/api/me/notifications")).andExpect(status().isOk()).andReturn()).path("items");
    }

    @Test
    void 받은_요청과_수락을_알린다() throws Exception {
        Session a = signup(uniqueLogin("fna")), b = signup(uniqueLogin("fnb"));
        request(a, b);
        JsonNode got = notifications(b);
        assertThat(got).hasSize(1);
        assertThat(got.get(0).path("type").asString()).isEqualTo("FRIEND_REQUEST");
        assertThat(got.get(0).path("actor").path("handle").asString()).isEqualTo(a.handle());
        assertThat(got.get(0).path("link").asString()).isEqualTo("/settings#friends");

        accept(b, a);
        JsonNode back = notifications(a);
        assertThat(back).hasSize(1);
        assertThat(back.get(0).path("type").asString()).isEqualTo("FRIEND_ACCEPTED");
        assertThat(back.get(0).path("actor").path("handle").asString()).isEqualTo(b.handle());
        assertThat(back.get(0).path("link").asString()).isEqualTo("/@" + b.handle());
        assertThat(notifications(b)).hasSize(1); // 수락한 사람에게는 새 알림이 없다
    }

    @Test
    void 맞요청으로_맺어지면_먼저_요청한_사람에게_수락을_알린다() throws Exception {
        Session a = signup(uniqueLogin("fnc")), b = signup(uniqueLogin("fnd"));
        request(a, b);
        request(b, a);
        JsonNode got = notifications(a);
        assertThat(got).hasSize(1);
        assertThat(got.get(0).path("type").asString()).isEqualTo("FRIEND_ACCEPTED");
    }

    @Test
    void 거절과_취소는_알리지_않고_다시_요청해도_7일에_한_번이다() throws Exception {
        Session a = signup(uniqueLogin("fne")), b = signup(uniqueLogin("fnf"));
        request(a, b);
        remove(a, b); // 요청 취소
        request(a, b);
        remove(b, a); // 거절
        request(a, b);
        assertThat(notifications(b)).hasSize(1);
        assertThat(notifications(a)).isEmpty();

        jdbc.update("UPDATE notification_actor SET created_at = now() - interval '8 days' WHERE actor_id = ?", a.memberId());
        remove(a, b);
        request(a, b);
        assertThat(notifications(b)).hasSize(2);
    }

    @Test
    void 처리_전에_취소된_요청과_끈_사람에게는_만들지_않는다() throws Exception {
        Session a = signup(uniqueLogin("fng")), b = signup(uniqueLogin("fnh")), c = signup(uniqueLogin("fni"));
        c.http().perform(asJson(put("/api/me/notification-settings"), Map.of("muted", List.of("FRIEND_REQUEST"))))
                .andExpect(status().isOk());
        request(a, c);
        assertThat(notifications(c)).isEmpty();
        JsonNode muted = read(c.http().perform(get("/api/me/notification-settings")).andExpect(status().isOk()).andReturn()).path("muted");
        assertThat(muted.toString()).contains("FRIEND_REQUEST");

        // 사건을 처리할 때 이미 요청이 취소됐거나 친구가 끊겼으면 만들지 않는다
        notifications.friendRequested(a.memberId(), b.memberId(), Instant.now());
        notifications.friendAccepted(b.memberId(), a.memberId(), Instant.now());
        assertThat(notifications(b)).isEmpty();
    }
}
