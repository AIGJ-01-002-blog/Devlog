package com.team.blog.view;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletResponse;

import com.team.blog.support.Browser;
import com.team.blog.support.IntegrationTest;
import com.team.blog.view.application.ViewFlushJob;

/** spec 013 인수 시나리오: 중복 없이 세기(US1), 세지 않는 조회(US2), 모아서 반영(US3). docs/31. */
class ViewTest extends IntegrationTest {
    static final String CHROME = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

    @Autowired ViewFlushJob flush;

    @BeforeEach
    void clearPending() {
        redis.delete(List.of("view:pending", "view:processing"));
    }

    long postOf(Session s, String visibility) throws Exception {
        long id = read(s.http().perform(asJson(post("/api/posts"), Map.of("title", "조회 글", "contentMd", "본문")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
        s.http().perform(asJson(post("/api/posts/" + id + "/publish"), Map.of("title", "조회 글", "contentMd", "본문",
                        "visibility", visibility, "baseVersion", 0, "tags", List.of()))
                .header("Idempotency-Key", UUID.randomUUID().toString())).andExpect(status().isOk());
        return id;
    }

    MockHttpServletResponse view(Browser b, long postId) throws Exception {
        return view(b, postId, CHROME);
    }

    MockHttpServletResponse view(Browser b, long postId, String ua) throws Exception {
        var req = post("/api/posts/" + postId + "/views").with(csrf());
        if (ua != null) req.header("User-Agent", ua);
        return b.perform(req).andReturn().getResponse();
    }

    long pending(long postId) {
        Object v = redis.opsForHash().get("view:pending", String.valueOf(postId));
        return v == null ? 0 : Long.parseLong(v.toString());
    }

    long stored(long postId) {
        return jdbc.queryForObject("SELECT view_count FROM post_stat WHERE post_id = ?", Long.class, postId);
    }

    @Test
    void 같은_방문자는_하루에_한_번만_센다() throws Exception {
        Session author = signup(uniqueLogin("vwa")), reader = signup(uniqueLogin("vwb"));
        long p = postOf(author, "PUBLIC");

        for (int i = 0; i < 3; i++) assertThat(view(reader.http(), p).getStatus()).isEqualTo(204);
        assertThat(pending(p)).isEqualTo(1);

        // 같은 회원이 다른 브라우저로 와도 회원 단위로 한 번
        view(relogin(reader), p);
        assertThat(pending(p)).isEqualTo(1);

        // 비회원은 첫 응답에서 방문자 쿠키를 받고, 그 뒤로는 쿠키로 판정한다
        Browser guest = browser().from("203.0.113.7");
        MockHttpServletResponse first = view(guest, p);
        assertThat(first.getStatus()).isEqualTo(204);
        assertThat(first.getHeader("Set-Cookie")).contains("vid=").contains("HttpOnly").contains("SameSite=Lax");
        assertThat(first.getHeader("Cache-Control")).contains("no-store");
        view(guest, p);
        assertThat(pending(p)).isEqualTo(2);

        // 쿠키를 거부하는 비회원은 IP·브라우저 해시로 판정한다
        Browser noCookie1 = browser().from("203.0.113.8"), noCookie2 = browser().from("203.0.113.8");
        view(noCookie1, p);
        view(noCookie2, p);
        assertThat(pending(p)).isEqualTo(3);

        assertThat(flush.flushAll()).isEqualTo(3);
        assertThat(stored(p)).isEqualTo(3);
        assertThat(redis.hasKey("view:processing")).isFalse();
    }

    @Test
    void 동시에_50번_보내도_한_번() throws Exception {
        Session author = signup(uniqueLogin("vwc")), reader = signup(uniqueLogin("vwd"));
        long p = postOf(author, "PUBLIC");
        ExecutorService pool = Executors.newFixedThreadPool(16);
        try {
            List<Callable<Integer>> calls = new ArrayList<>();
            for (int i = 0; i < 50; i++) calls.add(() -> view(reader.http(), p).getStatus());
            for (Future<Integer> f : pool.invokeAll(calls)) assertThat(f.get()).isIn(204, 429);
        } finally {
            pool.shutdown();
        }
        assertThat(pending(p)).isEqualTo(1);
    }

    @Test
    void 작성자_관리자_로봇_미리불러오기는_세지_않고_응답은_같다() throws Exception {
        Session author = signup(uniqueLogin("vwe")), admin = signup(uniqueLogin("vwf"));
        long p = postOf(author, "PUBLIC");
        jdbc.update("UPDATE member SET role = 'ADMIN' WHERE id = ?", admin.memberId());
        Browser adminBrowser = relogin(admin);

        assertThat(view(author.http(), p).getStatus()).isEqualTo(204);
        assertThat(view(adminBrowser, p).getStatus()).isEqualTo(204);
        assertThat(view(browser().from("203.0.113.20"), p, "Mozilla/5.0 (compatible; Googlebot/2.1)").getStatus()).isEqualTo(204);
        assertThat(view(browser().from("203.0.113.21"), p, "TelegramBot (like TwitterBot)").getStatus()).isEqualTo(204);
        assertThat(view(browser().from("203.0.113.22"), p, null).getStatus()).isEqualTo(204);
        assertThat(browser().from("203.0.113.23").perform(post("/api/posts/" + p + "/views").with(csrf())
                .header("User-Agent", CHROME).header("Sec-Purpose", "prefetch;prerender")).andReturn().getResponse().getStatus())
                .isEqualTo(204);
        assertThat(pending(p)).isZero();
    }

    @Test
    void 볼_수_없는_글은_404이고_세지_않는다() throws Exception {
        Session author = signup(uniqueLogin("vwg")), reader = signup(uniqueLogin("vwh"));
        long priv = postOf(author, "PRIVATE"), friends = postOf(author, "FRIENDS");
        long draft = read(author.http().perform(asJson(post("/api/posts"), Map.of("title", "임시", "contentMd", "본문")))
                .andReturn()).path("id").asLong();

        assertThat(view(reader.http(), priv).getStatus()).isEqualTo(404);
        assertThat(view(reader.http(), friends).getStatus()).isEqualTo(404);
        assertThat(view(reader.http(), draft).getStatus()).isEqualTo(404);
        assertThat(view(reader.http(), 999_999_999L).getStatus()).isEqualTo(404);
        assertThat(reader.http().perform(post("/api/posts/abc/views").with(csrf())).andReturn().getResponse().getStatus()).isEqualTo(404);
        assertThat(pending(priv) + pending(friends) + pending(draft)).isZero();
        // 작성자 본인은 볼 수 있으므로 404가 아니라 "안 셈"
        assertThat(view(author.http(), priv).getStatus()).isEqualTo(204);
    }

    @Test
    void 반영은_도중에_멈춰도_남은_글만_이어서_한다() throws Exception {
        Session author = signup(uniqueLogin("vwi"));
        long a = postOf(author, "PUBLIC"), b = postOf(author, "PUBLIC"), c = postOf(author, "PUBLIC");
        // 이전 반영이 a만 옮기고 멈춘 상태: 반영 중 해시에 b·c만 남아 있고, 그 사이 새 조회가 a에 모였다
        redis.opsForHash().putAll("view:processing", Map.of(String.valueOf(b), "2", String.valueOf(c), "3"));
        redis.opsForHash().put("view:pending", String.valueOf(a), "4");

        assertThat(flush.flushAll()).isEqualTo(5);
        assertThat(stored(a)).isZero();
        assertThat(stored(b)).isEqualTo(2);
        assertThat(stored(c)).isEqualTo(3);
        // 다음 차례에 새로 모인 것을 넘겨받는다
        assertThat(flush.flushAll()).isEqualTo(4);
        assertThat(stored(a)).isEqualTo(4);
        assertThat(flush.flushAll()).isZero();
    }

    @Test
    void 그_사이_완전_삭제된_글은_건너뛰고_IP는_남지_않는다() throws Exception {
        Session author = signup(uniqueLogin("vwj"));
        long p = postOf(author, "PUBLIC");
        view(browser().from("192.0.2.99"), p);
        assertThat(pending(p)).isEqualTo(1);
        // Redis 어느 키에도 원래 IP가 없다
        for (String key : redis.keys("view:*")) assertThat(key).doesNotContain("192.0.2.99");

        redis.opsForHash().put("view:pending", "999999999", "7");
        assertThat(flush.flushAll()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM post_view WHERE post_id = 999999999", Long.class)).isZero();
    }

    @Test
    void 상세의_조회수는_반영된_행_수와_같다() throws Exception {
        Session author = signup(uniqueLogin("vwk"));
        long p = postOf(author, "PUBLIC");
        for (int i = 0; i < 4; i++) view(browser().from("198.51.100." + (50 + i)), p);
        flush.flushAll();
        long detail = read(browser().perform(get("/api/posts/" + p)).andReturn()).path("viewCount").asLong();
        long daily = jdbc.queryForObject("""
                SELECT coalesce(sum(n), 0) FROM (SELECT count(*) AS n FROM post_view WHERE post_id = ?
                GROUP BY (viewed_at AT TIME ZONE 'Asia/Seoul')::date) d
                """, Long.class, p);
        assertThat(detail).isEqualTo(4).isEqualTo(daily);
    }
}
