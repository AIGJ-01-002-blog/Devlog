package com.team.blog.friend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;

import tools.jackson.databind.JsonNode;

import com.team.blog.friend.application.FriendEvents.FriendAccepted;
import com.team.blog.friend.application.FriendEvents.FriendRequested;
import com.team.blog.friend.application.LastActive;
import com.team.blog.support.IntegrationTest;

/** spec 008 인수 시나리오: 친구 맺기(US1), 최근 활동 표시(US2), 최근 활동 공개 끄기(US3). */
@RecordApplicationEvents
class FriendTest extends IntegrationTest {
    @Autowired ApplicationEvents events;

    String request(Session from, Session to) throws Exception {
        return read(from.http().perform(put("/api/me/friends/" + to.handle()).with(csrf())).andExpect(status().isOk()).andReturn())
                .path("relation").asString();
    }

    void accept(Session me, Session requester) throws Exception {
        me.http().perform(post("/api/me/friends/" + requester.handle() + "/accept").with(csrf())).andExpect(status().isOk());
    }

    void remove(Session me, Session other) throws Exception {
        me.http().perform(delete("/api/me/friends/" + other.handle()).with(csrf())).andExpect(status().isNoContent());
    }

    JsonNode overview(Session s) throws Exception {
        return read(s.http().perform(get("/api/me/friends")).andExpect(status().isOk()).andReturn());
    }

    List<String> handles(JsonNode list) {
        List<String> out = new ArrayList<>();
        list.forEach(n -> out.add(n.path("handle").asString()));
        return out;
    }

    JsonNode profile(Session viewer, Session target) throws Exception {
        var b = get("/api/members/" + target.handle());
        return read((viewer == null ? browser().perform(b) : viewer.http().perform(b)).andExpect(status().isOk()).andReturn());
    }

    void activeDaysAgo(Session s, int days) {
        jdbc.update("UPDATE member SET last_active_at = now() - make_interval(days => ?) WHERE id = ?", days, s.memberId());
    }

    long relationRows(Session a, Session b) {
        return jdbc.queryForObject("SELECT count(*) FROM friendship WHERE member_a_id = ? AND member_b_id = ?", Long.class,
                Math.min(a.memberId(), b.memberId()), Math.max(a.memberId(), b.memberId()));
    }

    // ---------------------------------------------------------------- US1

    @Test
    void 요청하고_수락하면_서로_친구가_된다() throws Exception {
        Session a = signup(uniqueLogin("fra")), b = signup(uniqueLogin("frb"));
        assertThat(request(a, b)).isEqualTo("SENT");
        assertThat(events.stream(FriendRequested.class).filter(e -> e.requesterId() == a.memberId() && e.receiverId() == b.memberId())).hasSize(1);
        assertThat(handles(overview(b).path("received"))).containsExactly(a.handle());
        assertThat(handles(overview(a).path("sent"))).containsExactly(b.handle());
        assertThat(profile(a, b).path("friendship").asString()).isEqualTo("SENT");
        assertThat(profile(b, a).path("friendship").asString()).isEqualTo("RECEIVED");

        accept(b, a);
        assertThat(events.stream(FriendAccepted.class).filter(e -> e.requesterId() == a.memberId() && e.accepterId() == b.memberId())).hasSize(1);
        assertThat(handles(overview(a).path("friends"))).containsExactly(b.handle());
        assertThat(handles(overview(b).path("friends"))).containsExactly(a.handle());
        assertThat(overview(b).path("received").size()).isZero();
        assertThat(profile(a, b).path("friendship").asString()).isEqualTo("FRIENDS");
        assertThat(jdbc.queryForObject("SELECT accepted_at IS NOT NULL FROM friendship WHERE requested_by = ?", Boolean.class, a.memberId())).isTrue();
    }

    @Test
    void 거절과_취소는_흔적을_남기지_않는다() throws Exception {
        Session a = signup(uniqueLogin("frrej")), b = signup(uniqueLogin("frrejb"));
        request(a, b);
        events.clear();
        remove(b, a); // 거절
        assertThat(relationRows(a, b)).isZero();
        assertThat(overview(a).path("sent").size()).isZero();
        assertThat(profile(a, b).path("friendship").asString()).isEqualTo("NONE");
        request(a, b);
        events.clear();
        remove(a, b); // 취소
        assertThat(overview(b).path("received").size()).isZero();
        assertThat(events.stream(FriendRequested.class).count() + events.stream(FriendAccepted.class).count()).isZero();
        remove(a, b); // 없는 관계도 같은 결과
    }

    @Test
    void 맞요청은_바로_친구가_되고_반복_요청은_아무것도_바꾸지_않는다() throws Exception {
        Session a = signup(uniqueLogin("frm")), b = signup(uniqueLogin("frmb"));
        assertThat(request(a, b)).isEqualTo("SENT");
        assertThat(request(a, b)).isEqualTo("SENT");
        assertThat(events.stream(FriendRequested.class).filter(e -> e.requesterId() == a.memberId())).hasSize(1);
        assertThat(request(b, a)).isEqualTo("FRIENDS");
        assertThat(request(a, b)).isEqualTo("FRIENDS");
        assertThat(relationRows(a, b)).isEqualTo(1);
        assertThat(events.stream(FriendAccepted.class).filter(e -> e.accepterId() == b.memberId())).hasSize(1);
    }

    @Test
    void 동시에_서로_여러_번_요청해도_관계는_하나이고_친구다() throws Exception {
        Session a = signup(uniqueLogin("frc")), b = signup(uniqueLogin("frcb"));
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<String>> calls = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                calls.add(() -> request(a, b));
                calls.add(() -> request(b, a));
            }
            for (Future<String> f : pool.invokeAll(calls)) f.get();
        } finally {
            pool.shutdownNow();
        }
        // 마지막까지 SENT만 나온 쪽이 있었다면 한 번 더 맞요청해 수락된다. 관계는 언제나 하나뿐이다
        assertThat(relationRows(a, b)).isEqualTo(1);
        request(b, a);
        assertThat(jdbc.queryForObject("SELECT status FROM friendship WHERE member_a_id = ?", String.class,
                Math.min(a.memberId(), b.memberId()))).isEqualTo("ACCEPTED");
    }

    @Test
    void 자신_없는_회원_탈퇴_유예_회원에게는_요청할_수_없다() throws Exception {
        Session a = signup(uniqueLogin("frself")), gone = signup(uniqueLogin("frgone"));
        a.http().perform(put("/api/me/friends/" + a.handle()).with(csrf())).andExpect(status().isBadRequest());
        a.http().perform(put("/api/me/friends/nobody-here-x").with(csrf())).andExpect(status().isNotFound());
        jdbc.update("UPDATE member SET withdrawn_at = now(), status = 'WITHDRAWN' WHERE id = ?", gone.memberId());
        a.http().perform(put("/api/me/friends/" + gone.handle()).with(csrf())).andExpect(status().isNotFound());
        browser().perform(put("/api/me/friends/" + a.handle()).with(csrf())).andExpect(status().isUnauthorized());
        browser().perform(get("/api/me/friends")).andExpect(status().isUnauthorized());
    }

    @Test
    void 받은_사람만_수락할_수_있고_남의_관계는_건드릴_수_없다() throws Exception {
        Session a = signup(uniqueLogin("frown")), b = signup(uniqueLogin("frownb")), c = signup(uniqueLogin("frownc"));
        request(a, b);
        a.http().perform(post("/api/me/friends/" + b.handle() + "/accept").with(csrf())).andExpect(status().isNotFound());
        c.http().perform(post("/api/me/friends/" + a.handle() + "/accept").with(csrf())).andExpect(status().isNotFound());
        remove(c, a);
        remove(c, b);
        assertThat(relationRows(a, b)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT status FROM friendship WHERE member_a_id = ? AND member_b_id = ?", String.class,
                Math.min(a.memberId(), b.memberId()), Math.max(a.memberId(), b.memberId()))).isEqualTo("PENDING");
    }

    // ---------------------------------------------------------------- US2·US3

    Session[] friends(String base) throws Exception {
        Session a = signup(uniqueLogin(base)), b = signup(uniqueLogin(base + "b"));
        request(a, b);
        accept(b, a);
        return new Session[] {a, b};
    }

    @Test
    void 친구에게만_최근_활동이_며칠_전으로_보인다() throws Exception {
        Session[] p = friends("fract");
        Session a = p[0], b = p[1];
        Session pending = signup(uniqueLogin("fractp")), stranger = signup(uniqueLogin("fracts"));
        request(pending, b);
        activeDaysAgo(b, 3);

        assertThat(profile(a, b).path("lastActiveDaysAgo").asInt()).isEqualTo(3);
        assertThat(overview(a).path("friends").get(0).path("lastActiveDaysAgo").asInt()).isEqualTo(3);
        for (Session other : new Session[] {pending, stranger, null}) {
            JsonNode prof = profile(other, b);
            assertThat(prof.path("lastActiveDaysAgo").isMissingNode() || prof.path("lastActiveDaysAgo").isNull()).isTrue();
        }
        // 응답 어디에도 정확한 시각이 없다
        assertThat(profile(a, b).toString()).doesNotContain("lastActiveAt");
        assertThat(overview(a).toString()).doesNotContain("lastActiveAt");

        activeDaysAgo(b, 10);
        assertThat(profile(a, b).path("lastActiveDaysAgo").asInt()).isEqualTo(LastActive.WEEK_OR_MORE);

        jdbc.update("UPDATE member SET last_active_at = NULL WHERE id = ?", b.memberId());
        assertThat(profile(a, b).path("lastActiveDaysAgo").isNull()).isTrue();

        activeDaysAgo(b, 1);
        remove(a, b);
        assertThat(profile(a, b).path("lastActiveDaysAgo").isNull()).isTrue();
    }

    @Test
    void 최근_활동_공개를_끄면_양쪽_모두_보이지_않는다() throws Exception {
        Session[] p = friends("froff");
        Session a = p[0], b = p[1];
        activeDaysAgo(a, 2);
        activeDaysAgo(b, 2);
        assertThat(read(a.http().perform(get("/api/me/settings")).andReturn()).path("lastActiveVisible").asBoolean()).isTrue();

        a.http().perform(asJson(patch("/api/me/settings"), Map.of("lastActiveVisible", false))).andExpect(status().isOk());
        assertThat(profile(b, a).path("lastActiveDaysAgo").isNull()).isTrue();
        assertThat(profile(a, b).path("lastActiveDaysAgo").isNull()).isTrue();
        assertThat(overview(a).path("lastActiveVisible").asBoolean()).isFalse();
        assertThat(overview(a).path("friends").get(0).path("lastActiveDaysAgo").isNull()).isTrue();
        // 기본 공개 범위는 그대로
        assertThat(read(a.http().perform(get("/api/me/settings")).andReturn()).path("defaultVisibility").asString()).isEqualTo("PUBLIC");

        a.http().perform(asJson(patch("/api/me/settings"), Map.of("lastActiveVisible", true))).andExpect(status().isOk());
        assertThat(profile(b, a).path("lastActiveDaysAgo").asInt()).isEqualTo(2);
        a.http().perform(asJson(patch("/api/me/settings"), Map.of())).andExpect(status().isBadRequest());
    }

    @Test
    void 로그인한_요청이_오면_최근_활동이_한_시간에_한_번_갱신된다() throws Exception {
        Session a = signup(uniqueLogin("fract2"));
        Instant first = jdbc.queryForObject("SELECT last_active_at FROM member WHERE id = ?", java.sql.Timestamp.class, a.memberId()).toInstant();
        assertThat(first).isNotNull();
        activeDaysAgo(a, 2);
        a.http().perform(get("/api/me/settings")).andExpect(status().isOk());
        // 한 시간 안에는 다시 쓰지 않는다
        assertThat(jdbc.queryForObject("SELECT last_active_at < now() - interval '1 day' FROM member WHERE id = ?", Boolean.class, a.memberId())).isTrue();
        redis.delete("active:" + a.memberId());
        a.http().perform(get("/api/me/settings")).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT last_active_at > now() - interval '1 minute' FROM member WHERE id = ?", Boolean.class, a.memberId())).isTrue();
    }
}
