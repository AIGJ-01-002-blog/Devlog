package com.team.blog.topic;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.IntegrationTest;
import com.team.blog.topic.application.TopicIndexJob;

/** spec 072 1단계: 홈 브랜치 그래프의 브랜치 정보와 거르기. */
class TopicTest extends IntegrationTest {
    @Autowired TopicIndexJob job;

    long publish(Session s, String title, String visibility, List<String> tags) throws Exception {
        long id = read(s.http().perform(asJson(post("/api/posts"), Map.of("title", title, "contentMd", "본문")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
        s.http().perform(asJson(post("/api/posts/" + id + "/publish"), Map.of("title", title, "contentMd", "본문",
                        "visibility", visibility, "baseVersion", 0, "tags", tags))
                .header("Idempotency-Key", UUID.randomUUID().toString())).andExpect(status().isOk());
        return id;
    }

    JsonNode home(String query) throws Exception {
        return read(browser().perform(get("/api/posts" + query)).andExpect(status().isOk()).andReturn());
    }

    static List<Long> ids(JsonNode page) {
        List<Long> out = new ArrayList<>();
        page.path("items").forEach(n -> out.add(n.path("id").asLong()));
        return out;
    }

    static String tag(String base) {
        return base + UUID.randomUUID().toString().substring(0, 6);
    }

    @Test
    void 태그가_비슷한_글이_주제_브랜치로_묶이고_홈에서_그_브랜치만_볼_수_있다() throws Exception {
        Session s = signup(uniqueLogin("tp"));
        String t1 = tag("ta"), t2 = tag("tb"), t3 = tag("tc");
        long a = publish(s, "검색 다듬기 1", "PUBLIC", List.of(t1, t2));
        long b = publish(s, "검색 다듬기 2", "PUBLIC", List.of(t1, t2));
        long other = publish(s, "상관없는 글", "PUBLIC", List.of(t3));
        long hidden = publish(s, "비공개 글", "PRIVATE", List.of(t1, t2));
        job.runOnce();

        Long key = jdbc.queryForObject("SELECT topic_key FROM post_topic WHERE post_id = ?", Long.class, a);
        assertThat(key).isEqualTo(Math.min(a, b));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM post_topic WHERE post_id IN (?, ?)", Long.class, other, hidden)).isZero();

        JsonNode page = home("?branch=t" + key);
        assertThat(ids(page)).containsExactly(b, a);
        JsonNode newest = page.path("items").get(0).path("branch");
        assertThat(newest.path("kind").asString()).isEqualTo("TOPIC");
        assertThat(newest.path("key").asString()).isEqualTo("t" + key);
        assertThat(newest.path("name").asString()).isEqualTo(t1.compareTo(t2) < 0 ? t1 : t2);
        assertThat(newest.path("index").asInt()).isEqualTo(2);
        assertThat(newest.path("total").asInt()).isEqualTo(2);
        assertThat(newest.path("url").asString()).isEqualTo("/?branch=t" + key);

        // 홈 전체 목록에서도 같은 브랜치가 붙고, 묶이지 않은 글에는 branch가 없다
        JsonNode all = home("");
        for (JsonNode n : all.path("items")) {
            if (n.path("id").asLong() == other) assertThat(n.has("branch")).isFalse();
            if (n.path("id").asLong() == a) assertThat(n.path("branch").path("index").asInt()).isEqualTo(1);
        }

        JsonNode popular = read(browser().perform(get("/api/topics/popular")).andExpect(status().isOk()).andReturn());
        assertThat(popular.isArray()).isTrue();
    }

    @Test
    void 시리즈에_든_글은_시리즈_브랜치만_갖는다() throws Exception {
        Session s = signup(uniqueLogin("tq"));
        String t1 = tag("sa"), t2 = tag("sb");
        long first = publish(s, "시리즈 1편", "PUBLIC", List.of(t1, t2));
        long second = publish(s, "시리즈 2편", "PUBLIC", List.of(t1, t2));
        long seriesId = read(s.http().perform(asJson(post("/api/me/series"), Map.of("name", "브랜치 시리즈")))
                .andExpect(status().isOk()).andReturn()).path("id").asLong();
        for (long id : List.of(first, second)) {
            s.http().perform(asJson(put("/api/posts/" + id + "/series"), Map.of("seriesId", seriesId))).andExpect(status().isNoContent());
        }
        job.runOnce();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM post_topic WHERE post_id IN (?, ?)", Long.class, first, second)).isZero();

        JsonNode page = home("?branch=s" + seriesId);
        assertThat(ids(page)).containsExactly(second, first);
        JsonNode b = page.path("items").get(0).path("branch");
        assertThat(b.path("kind").asString()).isEqualTo("SERIES");
        assertThat(b.path("name").asString()).isEqualTo("브랜치 시리즈");
        assertThat(b.path("index").asInt()).isEqualTo(2);
        assertThat(b.path("total").asInt()).isEqualTo(2);
        assertThat(b.path("url").asString()).startsWith("/@" + s.handle() + "/series/");
    }

    @Test
    void 브랜치_형식이_틀리면_404() throws Exception {
        browser().perform(get("/api/posts?branch=x1")).andExpect(status().isNotFound());
        browser().perform(get("/api/posts?branch=t0")).andExpect(status().isNotFound());
        // 없는 브랜치는 빈 목록
        assertThat(ids(home("?branch=t999999999"))).isEmpty();
    }
}
