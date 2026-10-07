package com.team.blog.like;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;

import tools.jackson.databind.JsonNode;

import com.team.blog.like.application.LikeEvents.PostLiked;
import com.team.blog.like.application.LikeEvents.PostUnliked;
import com.team.blog.support.IntegrationTest;

/** spec 012 인수 시나리오: 누르기·취소(US1), 정확한 수(US2), 누를 수 없는 사람(US3). docs/30 §9·docs/42 §7. */
@RecordApplicationEvents
class LikeTest extends IntegrationTest {
    @Autowired ApplicationEvents events;

    long postOf(Session s, String visibility) throws Exception {
        long id = read(s.http().perform(asJson(post("/api/posts"), Map.of("title", "좋아요 글", "contentMd", "본문")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
        s.http().perform(asJson(post("/api/posts/" + id + "/publish"), Map.of("title", "좋아요 글", "contentMd", "본문",
                        "visibility", visibility, "baseVersion", 0, "tags", List.of()))
                .header("Idempotency-Key", UUID.randomUUID().toString())).andExpect(status().isOk());
        return id;
    }

    int likeStatus(Session s, long postId, boolean like) throws Exception {
        var req = (like ? put("/api/posts/" + postId + "/like") : delete("/api/posts/" + postId + "/like")).with(csrf());
        return s.http().perform(req).andReturn().getResponse().getStatus();
    }

    JsonNode set(Session s, long postId, boolean like) throws Exception {
        var req = (like ? put("/api/posts/" + postId + "/like") : delete("/api/posts/" + postId + "/like")).with(csrf());
        return read(s.http().perform(req).andExpect(status().isOk()).andReturn());
    }

    long rows(long postId) {
        return jdbc.queryForObject("SELECT count(*) FROM post_like WHERE post_id = ?", Long.class, postId);
    }

    long shown(long postId) {
        return jdbc.queryForObject("SELECT like_count FROM post_stat WHERE post_id = ?", Long.class, postId);
    }

    void resetAllLimits() {
        var keys = redis.keys("rl:*");
        if (keys != null && !keys.isEmpty()) redis.delete(keys);
    }

    void resetLimits() {
        var keys = redis.keys("rl:like:*");
        if (keys != null && !keys.isEmpty()) redis.delete(keys);
    }

    @Test
    void 누르고_취소하고_같은_요청은_한_번과_같다() throws Exception {
        Session author = signup(uniqueLogin("lka")), reader = signup(uniqueLogin("lkb"));
        long p = postOf(author, "PUBLIC");

        JsonNode r = set(reader, p, true);
        assertThat(r.path("liked").asBoolean()).isTrue();
        assertThat(r.path("likeCount").asInt()).isEqualTo(1);
        assertThat(set(reader, p, true).path("likeCount").asInt()).isEqualTo(1);
        assertThat(events.stream(PostLiked.class).filter(e -> e.postId() == p)).hasSize(1)
                .allMatch(e -> e.authorId() == author.memberId() && e.likerId() == reader.memberId());

        // 상세가 처음부터 눌렀는지 알려 준다, 작성자에게는 false
        assertThat(read(reader.http().perform(get("/api/posts/" + p)).andReturn()).path("liked").asBoolean()).isTrue();
        assertThat(read(author.http().perform(get("/api/posts/" + p)).andReturn()).path("liked").asBoolean()).isFalse();
        assertThat(read(author.http().perform(get("/api/posts/" + p)).andReturn()).path("likeCount").asInt()).isEqualTo(1);

        r = set(reader, p, false);
        assertThat(r.path("liked").asBoolean()).isFalse();
        assertThat(r.path("likeCount").asInt()).isZero();
        set(reader, p, false);
        assertThat(events.stream(PostUnliked.class).filter(e -> e.postId() == p)).hasSize(1);
        assertThat(rows(p)).isZero();
    }

    @Test
    void 동시에_보내도_수는_실제_건수와_같다() throws Exception {
        Session author = signup(uniqueLogin("lkc"));
        long p = postOf(author, "PUBLIC");
        Session one = signup(uniqueLogin("lkd"));

        // 같은 사람이 동시에 20번 → 1건, 사건 1번
        assertThat(runAll(20, i -> () -> likeStatus(one, p, true))).containsOnly(200);
        assertThat(rows(p)).isEqualTo(1);
        assertThat(events.stream(PostLiked.class).filter(e -> e.postId() == p)).hasSize(1);

        // 같은 사람이 20 + 20번을 섞어서, 3회 반복: 매번 수 = 실제 행
        for (int round = 0; round < 3; round++) {
            resetLimits();
            runAll(40, i -> () -> likeStatus(one, p, i % 2 == 0));
            assertThat(shown(p)).isEqualTo(rows(p)).isBetween(0L, 1L);
        }

        // 서로 다른 50명 동시 누름, 그 50명 취소 + 다른 8명 누름 동시
        List<Session> fifty = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            if (i % 10 == 0) resetAllLimits(); // 가입 요청 제한을 피한다
            fifty.add(signup(uniqueLogin("lk" + i)));
        }
        resetAllLimits();
        List<Session> eight = new ArrayList<>();
        for (int i = 0; i < 8; i++) eight.add(signup(uniqueLogin("lke" + i)));
        likeStatus(one, p, false);
        assertThat(runAll(50, i -> () -> likeStatus(fifty.get(i), p, true))).containsOnly(200);
        assertThat(shown(p)).isEqualTo(50).isEqualTo(rows(p));
        runAll(58, i -> () -> i < 50 ? likeStatus(fifty.get(i), p, false) : likeStatus(eight.get(i - 50), p, true));
        assertThat(shown(p)).isEqualTo(8).isEqualTo(rows(p));
    }

    @Test
    void 누를_수_없는_요청은_수를_바꾸지_않는다() throws Exception {
        Session author = signup(uniqueLogin("lkf")), reader = signup(uniqueLogin("lkg"));
        long pub = postOf(author, "PUBLIC");
        long pri = postOf(author, "PRIVATE");
        long fr = postOf(author, "FRIENDS");

        // 비회원 401
        assertThat(browser().perform(put("/api/posts/" + pub + "/like").with(csrf())).andReturn().getResponse().getStatus()).isEqualTo(401);
        // 자기 글 403 (업무 규칙)
        String own = author.http().perform(put("/api/posts/" + pub + "/like").with(csrf())).andExpect(status().isForbidden())
                .andReturn().getResponse().getContentAsString();
        assertThat(own).contains("CANNOT_LIKE_OWN_POST");
        // 볼 수 없는 글은 없는 글과 같은 404 (자기 글이어도 볼 수 없는 상태면 404)
        assertThat(likeStatus(reader, pri, true)).isEqualTo(404);
        assertThat(likeStatus(reader, fr, true)).isEqualTo(404);
        assertThat(likeStatus(reader, 9_000_000_000L, true)).isEqualTo(404);
        long draft = read(author.http().perform(asJson(post("/api/posts"), Map.of("title", "t", "contentMd", "b")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
        assertThat(likeStatus(reader, draft, true)).isEqualTo(404);
        assertThat(likeStatus(author, draft, true)).isEqualTo(404);
        set(reader, pub, true);
        jdbc.update("UPDATE post SET hidden_at = now(), hidden_reason = 'SPAM' WHERE id = ?", pub);
        assertThat(likeStatus(reader, pub, false)).isEqualTo(404);
        assertThat(rows(pub)).isEqualTo(1); // 숨겨도 지우지 않는다
        jdbc.update("UPDATE post SET hidden_at = NULL, hidden_reason = NULL, deleted_at = now() WHERE id = ?", pub);
        assertThat(likeStatus(reader, pub, false)).isEqualTo(404);
        jdbc.update("UPDATE post SET deleted_at = NULL WHERE id = ?", pub);
        assertThat(set(reader, pub, true).path("likeCount").asInt()).isEqualTo(1); // 복구하면 그대로
    }

    @Test
    void 일분에_60번을_넘으면_429와_다시_시도할_시점() throws Exception {
        Session author = signup(uniqueLogin("lkh")), reader = signup(uniqueLogin("lki"));
        long p = postOf(author, "PUBLIC");
        resetLimits();
        for (int i = 0; i < 60; i++) assertThat(likeStatus(reader, p, i % 2 == 0)).isEqualTo(200);
        var res = reader.http().perform(put("/api/posts/" + p + "/like").with(csrf())).andReturn().getResponse();
        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(res.getHeader("Retry-After")).isNotBlank();
        resetLimits();
    }

    interface Job { Callable<Integer> at(int i); }

    static List<Integer> runAll(int n, Job job) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(Math.min(n, 20));
        try {
            List<Future<Integer>> fs = new ArrayList<>();
            for (int i = 0; i < n; i++) fs.add(pool.submit(job.at(i)));
            List<Integer> out = new ArrayList<>();
            for (Future<Integer> f : fs) out.add(f.get());
            return out;
        } finally {
            pool.shutdown();
        }
    }
}
