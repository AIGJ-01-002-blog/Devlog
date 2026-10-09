package com.team.blog.view;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.Browser;
import com.team.blog.support.IntegrationTest;

/** spec 070: 유입 경로는 새 방문마다 한 번, 많이 본 화면은 화면을 열 때마다 센다. 대시보드에 둘 다 나온다. */
class SourcePageTest extends IntegrationTest {

    int send(Browser b, String json) throws Exception {
        return b.perform(post("/api/visits").with(csrf()).header("User-Agent", ViewTest.CHROME)
                .contentType(MediaType.APPLICATION_JSON).content(json)).andReturn().getResponse().getStatus();
    }

    long source(String source, String host) {
        return jdbc.queryForObject("""
                SELECT coalesce(sum(visits), 0) FROM visit_source_day
                WHERE day = (now() AT TIME ZONE 'Asia/Seoul')::date AND source = ? AND host = ?
                """, Long.class, source, host);
    }

    long page(String path) {
        return jdbc.queryForObject("""
                SELECT coalesce(sum(views), 0) FROM page_view_day WHERE day = (now() AT TIME ZONE 'Asia/Seoul')::date AND path = ?
                """, Long.class, path);
    }

    @Test
    void 새_방문마다_유입_경로를_한_번_세고_화면은_열_때마다_센다() throws Exception {
        long google = source("google", "");
        long home = page("/");
        long tags = page("/tags");
        Browser guest = browser().from("203.0.113.71");

        assertThat(send(guest, "{\"first\":true,\"path\":\"/\",\"referrer\":\"https://www.google.com/\"}")).isEqualTo(204);
        // 같은 방문 안에서 새로 고침하면 유입 경로는 다시 세지 않고 화면만 센다
        send(guest, "{\"first\":true,\"path\":\"/\",\"referrer\":\"https://www.google.com/\"}");
        send(guest, "{\"first\":false,\"path\":\"/tags\"}");
        send(guest, "{\"first\":false,\"path\":\"/admin\"}");
        assertThat(source("google", "")).isEqualTo(google + 1);
        assertThat(page("/")).isEqualTo(home + 2);
        assertThat(page("/tags")).isEqualTo(tags + 1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM page_view_day WHERE path LIKE '/admin%'", Long.class)).isZero();

        // 30분 넘게 쉬었다 오면 새 방문이라 다시 센다
        jdbc.update("UPDATE site_visit SET last_at = last_at - interval '31 minutes' WHERE NOT member AND last_at > now() - interval '1 minute'");
        send(guest, "{\"first\":true,\"path\":\"/\",\"referrer\":\"https://www.google.com/\"}");
        assertThat(source("google", "")).isEqualTo(google + 2);
    }

    @Test
    void 값_없이_온_예전_화면과_로봇은_화면을_세지_않는다() throws Exception {
        long direct = source("direct", "");
        Browser guest = browser().from("203.0.113.72");
        assertThat(guest.perform(post("/api/visits").with(csrf()).header("User-Agent", ViewTest.CHROME)).andReturn().getResponse().getStatus())
                .isEqualTo(204);
        assertThat(source("direct", "")).isEqualTo(direct + 1);

        long home = page("/");
        assertThat(browser().from("203.0.113.73").perform(post("/api/visits").with(csrf()).header("User-Agent", "Googlebot/2.1")
                .contentType(MediaType.APPLICATION_JSON).content("{\"first\":false,\"path\":\"/\"}")).andReturn().getResponse().getStatus())
                .isEqualTo(204);
        assertThat(page("/")).isEqualTo(home);

        // 오늘 방문 없이 화면 이동만 보내면 세지 않는다 (쿠키를 바꿔 가며 화면 수 부풀리기 막기)
        long tags = page("/tags");
        assertThat(send(browser().from("203.0.113.76"), "{\"first\":false,\"path\":\"/tags\"}")).isEqualTo(204);
        assertThat(page("/tags")).isEqualTo(tags);
    }

    @Test
    void 대시보드에_유입_경로와_많이_본_화면이_나온다() throws Exception {
        Session admin = signup(uniqueLogin("spd"));
        jdbc.update("UPDATE member SET role = 'ADMIN' WHERE id = ?", admin.memberId());
        Browser a = relogin(admin);
        JsonNode before = read(a.perform(get("/api/admin/dashboard?days=7")).andExpect(status().isOk()).andReturn());

        send(browser().from("203.0.113.74"), "{\"first\":true,\"path\":\"/releases\",\"referrer\":\"https://search.naver.com/\"}");
        send(browser().from("203.0.113.75"), "{\"first\":true,\"path\":\"/releases\",\"referrer\":\"https://blog.example.org/x\"}");

        JsonNode d = read(a.perform(get("/api/admin/dashboard?days=7")).andExpect(status().isOk()).andReturn());
        assertThat(d.path("current").path("searchVisits").asLong()).isEqualTo(before.path("current").path("searchVisits").asLong() + 1);
        JsonNode last = d.path("daily").get(d.path("daily").size() - 1);
        assertThat(last.path("searchVisits").asLong()).isPositive();
        assertThat(d.path("sources").findValuesAsString("source")).contains("naver");
        assertThat(d.path("sources").findValuesAsString("host")).contains("blog.example.org");
        assertThat(d.path("topPages").findValuesAsString("path")).contains("/releases");
    }
}
