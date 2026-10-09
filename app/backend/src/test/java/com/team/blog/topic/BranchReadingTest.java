package com.team.blog.topic;

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

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.IntegrationTest;
import com.team.blog.topic.application.TopicIndexJob;

/** spec 072 2단계: 글 화면 브랜치 상자·비슷한 글, 시리즈 구독 알림, 발행 창 브랜치 추천·묶지 않기. */
class BranchReadingTest extends IntegrationTest {
    @Autowired TopicIndexJob job;

    long draft(Session s, String title) throws Exception {
        return read(s.http().perform(asJson(post("/api/posts"), Map.of("title", title, "contentMd", "본문")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    void publish(Session s, long id, String title, String visibility, List<String> tags) throws Exception {
        s.http().perform(asJson(post("/api/posts/" + id + "/publish"), Map.of("title", title, "contentMd", "본문",
                        "visibility", visibility, "baseVersion", 0, "tags", tags))
                .header("Idempotency-Key", UUID.randomUUID().toString())).andExpect(status().isOk());
    }

    long publish(Session s, String title, List<String> tags) throws Exception {
        long id = draft(s, title);
        publish(s, id, title, "PUBLIC", tags);
        return id;
    }

    long series(Session s, String name) throws Exception {
        return read(s.http().perform(asJson(post("/api/me/series"), Map.of("name", name)))
                .andExpect(status().isOk()).andReturn()).path("id").asLong();
    }

    void assign(Session s, long postId, long seriesId) throws Exception {
        s.http().perform(asJson(put("/api/posts/" + postId + "/series"), Map.of("seriesId", seriesId))).andExpect(status().isNoContent());
    }

    JsonNode notifications(Session s) throws Exception {
        drain();
        return read(s.http().perform(get("/api/me/notifications")).andExpect(status().isOk()).andReturn()).path("items");
    }

    static String tag(String base) {
        return base + UUID.randomUUID().toString().substring(0, 6);
    }

    static List<Long> ids(JsonNode arr) {
        List<Long> out = new ArrayList<>();
        arr.forEach(n -> out.add(n.path("id").asLong()));
        return out;
    }

    @Test
    void 주제_브랜치_상자와_비슷한_글은_공개_글만_보인다() throws Exception {
        Session s = signup(uniqueLogin("br"));
        String t1 = tag("ba"), t2 = tag("bb"), t3 = tag("bc");
        long a = publish(s, "브랜치 1", List.of(t1, t2));
        long b = publish(s, "브랜치 2", List.of(t1, t2));
        long near = publish(s, "태그 하나 겹침", List.of(t2, t3));
        long draftOnly = draft(s, "임시글");
        job.runOnce();

        JsonNode box = read(browser().perform(get("/api/posts/" + b + "/topic")).andExpect(status().isOk()).andReturn());
        assertThat(box.path("index").asInt()).isEqualTo(2);
        assertThat(ids(box.path("posts"))).containsExactly(a, b);
        assertThat(box.path("posts").get(0).path("url").asString()).isEqualTo("/@" + s.handle() + "/posts/" + a);
        browser().perform(get("/api/posts/" + near + "/topic")).andExpect(status().isNoContent());

        // 같은 브랜치 글은 상자에 있으니 비슷한 글에서는 빠지고, 태그가 겹치는 다른 글이 온다
        JsonNode similar = read(browser().perform(get("/api/posts/" + b + "/similar")).andExpect(status().isOk()).andReturn());
        assertThat(ids(similar)).contains(near).doesNotContain(a, b);
        // 공개 글이 아니면 빈 목록
        JsonNode none = read(browser().perform(get("/api/posts/" + draftOnly + "/similar")).andExpect(status().isOk()).andReturn());
        assertThat(none.size()).isZero();
    }

    @Test
    void 구독한_시리즈에_새_글이_공개되면_알림이_한_번_간다() throws Exception {
        Session author = signup(uniqueLogin("bs")), reader = signup(uniqueLogin("bt")), both = signup(uniqueLogin("bu"));
        long sid = series(author, "구독 시리즈");
        long first = draft(author, "1편");
        assign(author, first, sid);
        publish(author, first, "1편", "PUBLIC", List.of());

        String path = "/api/members/" + author.handle() + "/series/" + read(author.http().perform(get("/api/me/series"))
                .andReturn()).get(0).path("slug").asString();
        assertThat(read(reader.http().perform(get(path)).andReturn()).path("subscribed").asBoolean()).isFalse();
        assertThat(read(browser().perform(get(path)).andReturn()).has("subscribed")).isFalse();
        for (Session s : List.of(reader, both)) {
            s.http().perform(put("/api/series/" + sid + "/subscription").with(csrf())).andExpect(status().isNoContent());
        }
        both.http().perform(put("/api/members/" + author.handle() + "/follow").with(csrf())).andExpect(status().isOk());
        assertThat(read(reader.http().perform(get(path)).andReturn()).path("subscribed").asBoolean()).isTrue();
        author.http().perform(put("/api/series/" + sid + "/subscription").with(csrf())).andExpect(status().isBadRequest());

        long second = draft(author, "2편");
        assign(author, second, sid);
        publish(author, second, "2편", "PUBLIC", List.of());
        JsonNode got = notifications(reader);
        assertThat(got).hasSize(1);
        assertThat(got.get(0).path("type").asString()).isEqualTo("NEW_POST");
        assertThat(got.get(0).path("post").path("title").asString()).isEqualTo("2편");
        // 팔로우와 구독을 함께 해도 하나만
        assertThat(notifications(both)).hasSize(1);

        reader.http().perform(delete("/api/series/" + sid + "/subscription").with(csrf())).andExpect(status().isNoContent());
        long third = draft(author, "3편");
        assign(author, third, sid);
        publish(author, third, "3편", "PUBLIC", List.of());
        assertThat(notifications(reader)).hasSize(1);
    }

    @Test
    void 발행_창은_태그가_겹치는_내_시리즈와_주제_브랜치를_추천하고_묶지_않기를_지킨다() throws Exception {
        Session s = signup(uniqueLogin("bv")), other = signup(uniqueLogin("bw"));
        String t1 = tag("ca"), t2 = tag("cb"), t3 = tag("cc"), t4 = tag("cd");
        long sid = series(s, "내 시리즈");
        long inSeries = draft(s, "시리즈 글");
        assign(s, inSeries, sid);
        publish(s, inSeries, "시리즈 글", "PUBLIC", List.of(t3, t4));
        publish(other, "남의 1", List.of(t1, t2));
        publish(other, "남의 2", List.of(t1, t2));
        job.runOnce();

        long mine = draft(s, "새 글");
        JsonNode r = read(s.http().perform(asJson(post("/api/posts/" + mine + "/branch-suggestion"), Map.of("tags", List.of(t1, t2))))
                .andExpect(status().isOk()).andReturn());
        assertThat(r.path("topic").path("kind").asString()).isEqualTo("TOPIC");
        assertThat(r.path("topic").path("shared").size()).isEqualTo(2);
        assertThat(r.path("series").isNull() || r.path("series").isMissingNode()).isTrue();

        r = read(s.http().perform(asJson(post("/api/posts/" + mine + "/branch-suggestion"), Map.of("tags", List.of(t3))))
                .andExpect(status().isOk()).andReturn());
        assertThat(r.path("series").path("seriesId").asLong()).isEqualTo(sid);

        // 시리즈에 든 글은 지금 시리즈를 알려 주고 추천하지 않는다
        r = read(s.http().perform(asJson(post("/api/posts/" + inSeries + "/branch-suggestion"), Map.of("tags", List.of(t1))))
                .andExpect(status().isOk()).andReturn());
        assertThat(r.path("current").path("seriesId").asLong()).isEqualTo(sid);

        // 남의 글에는 추천·묶지 않기를 할 수 없다
        other.http().perform(asJson(post("/api/posts/" + mine + "/branch-suggestion"), Map.of("tags", List.of(t1))))
                .andExpect(status().isNotFound());

        // 묶지 않기: 같은 태그로 발행해도 주제 브랜치로 묶이지 않는다
        s.http().perform(asJson(put("/api/posts/" + mine + "/topic-optout"), Map.of("optOut", true))).andExpect(status().isNoContent());
        publish(s, mine, "새 글", "PUBLIC", List.of(t1, t2));
        job.runOnce();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM post_topic WHERE post_id = ?", Long.class, mine)).isZero();
        r = read(s.http().perform(asJson(post("/api/posts/" + mine + "/branch-suggestion"), Map.of("tags", List.of(t1, t2))))
                .andExpect(status().isOk()).andReturn());
        assertThat(r.path("optedOut").asBoolean()).isTrue();
        assertThat(r.path("topic").isNull() || r.path("topic").isMissingNode()).isTrue();
    }
}
