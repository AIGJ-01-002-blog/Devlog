package com.team.blog.portfolio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.IntegrationTest;

/** spec 072 3단계: 포트폴리오 모드. 프로젝트 = 포트폴리오에 보이기로 한 시리즈, 공개 글만 보인다. */
class PortfolioTest extends IntegrationTest {
    long write(Session s, String title, String visibility) throws Exception {
        long id = read(s.http().perform(asJson(post("/api/posts"), Map.of("title", title, "contentMd", "본문")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
        s.http().perform(asJson(post("/api/posts/" + id + "/publish"), Map.of("title", title, "contentMd", "본문",
                        "visibility", visibility, "baseVersion", 0, "tags", List.of()))
                .header("Idempotency-Key", UUID.randomUUID().toString())).andExpect(status().isOk());
        return id;
    }

    static Map<String, Object> fields(boolean portfolio) {
        Map<String, Object> m = new HashMap<>();
        m.put("portfolio", portfolio);
        m.put("period", " 2026.03 ~ 2026.10 ");
        m.put("summary", "AI와 함께 쓰는 개발 블로그");
        m.put("tech", List.of("Spring Boot", "React", "spring boot", "", "PostgreSQL"));
        m.put("teamWork", "검색·알림·배포를 함께 만들었다");
        m.put("myRole", "브랜치 그래프와 포트폴리오 화면");
        return m;
    }

    @Test
    void 포트폴리오에_보이기로_한_시리즈만_프로젝트로_공개_글과_함께_보인다() throws Exception {
        Session s = signup(uniqueLogin("pf")), other = signup(uniqueLogin("pg"));
        long sid = read(s.http().perform(asJson(post("/api/me/series"), Map.of("name", "devlog 프로젝트")))
                .andExpect(status().isOk()).andReturn()).path("id").asLong();
        long hiddenSeries = read(s.http().perform(asJson(post("/api/me/series"), Map.of("name", "숨긴 시리즈")))
                .andExpect(status().isOk()).andReturn()).path("id").asLong();
        long pub = write(s, "공개 글", "PUBLIC");
        long friends = write(s, "친구 글", "FRIENDS");
        for (long id : List.of(pub, friends)) {
            s.http().perform(asJson(put("/api/posts/" + id + "/series"), Map.of("seriesId", sid))).andExpect(status().isNoContent());
        }

        JsonNode saved = read(s.http().perform(asJson(put("/api/me/series/" + sid + "/project"), fields(true)))
                .andExpect(status().isOk()).andReturn());
        assertThat(saved.path("period").asString()).isEqualTo("2026.03 ~ 2026.10");
        assertThat(saved.path("tech").size()).isEqualTo(4);
        s.http().perform(asJson(put("/api/me/series/" + hiddenSeries + "/project"), fields(false))).andExpect(status().isOk());
        // 남의 시리즈는 고칠 수 없다
        other.http().perform(asJson(put("/api/me/series/" + sid + "/project"), fields(true))).andExpect(status().isNotFound());
        Map<String, Object> tooLong = fields(true);
        tooLong.put("summary", "가".repeat(201));
        s.http().perform(asJson(put("/api/me/series/" + sid + "/project"), tooLong)).andExpect(status().isBadRequest());

        JsonNode p = read(browser().perform(get("/api/members/" + s.handle() + "/portfolio")).andExpect(status().isOk()).andReturn());
        assertThat(p.path("handle").asString()).isEqualTo(s.handle());
        assertThat(p.path("postCount").asLong()).isEqualTo(1);
        assertThat(p.path("projects").size()).isEqualTo(1);
        JsonNode project = p.path("projects").get(0);
        assertThat(project.path("name").asString()).isEqualTo("devlog 프로젝트");
        assertThat(project.path("myRole").asString()).isEqualTo("브랜치 그래프와 포트폴리오 화면");
        assertThat(project.path("posts").size()).isEqualTo(1);
        assertThat(project.path("posts").get(0).path("id").asLong()).isEqualTo(pub);

        // 화면 주소도 서버가 제목과 프로젝트를 담아 준다
        String html = browser().perform(get("/@" + s.handle() + "/portfolio")).andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(html).contains("의 개발 기록").contains("devlog 프로젝트").doesNotContain("숨긴 시리즈");

        browser().perform(get("/api/members/nobody-" + UUID.randomUUID().toString().substring(0, 6) + "/portfolio"))
                .andExpect(status().isNotFound());
    }
}
