package com.team.blog.like;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.IntegrationTest;

/** spec 027 좋아한 글: 최신 좋아요 순, 지금 읽을 수 있는 글만, 9개씩. */
class LikedPostsTest extends IntegrationTest {
    long publish(Session s, String title, String visibility) throws Exception {
        long id = read(s.http().perform(asJson(post("/api/posts"), Map.of("title", title, "contentMd", "")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
        s.http().perform(asJson(post("/api/posts/" + id + "/publish"), Map.of("title", title, "contentMd", "본문",
                        "visibility", visibility, "baseVersion", 0, "tags", List.of()))
                .header("Idempotency-Key", UUID.randomUUID().toString())).andExpect(status().isOk());
        return id;
    }

    void like(Session s, long postId) throws Exception {
        s.http().perform(put("/api/posts/" + postId + "/like").with(csrf())).andExpect(status().isOk());
    }

    JsonNode liked(Session s, String cursor) throws Exception {
        var req = get("/api/me/liked-posts");
        if (cursor != null) req.param("cursor", cursor);
        return read(s.http().perform(req).andExpect(status().isOk()).andReturn());
    }

    static List<Long> ids(JsonNode page) {
        List<Long> out = new ArrayList<>();
        page.path("items").forEach(n -> out.add(n.path("id").asLong()));
        return out;
    }

    @Test
    void 좋아한_글을_최근_순으로_읽을_수_있는_것만_본다() throws Exception {
        Session author = signup(uniqueLogin("lka")), reader = signup(uniqueLogin("lkr"));
        reader.http().perform(put("/api/me/friends/" + author.handle()).with(csrf())).andExpect(status().isOk());
        author.http().perform(post("/api/me/friends/" + reader.handle() + "/accept").with(csrf())).andExpect(status().isOk());

        long pub = publish(author, "공개", "PUBLIC"), fr = publish(author, "친구", "FRIENDS"), later = publish(author, "나중", "PUBLIC");
        like(reader, pub);
        like(reader, fr);
        like(reader, later);
        assertThat(ids(liked(reader, null))).containsExactly(later, fr, pub);

        // 비공개로 바꾸면 빠지고, 친구를 끊으면 친구 공개 글이 빠진다
        author.http().perform(asJson(patch("/api/posts/" + later + "/visibility"), Map.of("visibility", "PRIVATE")))
                .andExpect(status().isOk());
        reader.http().perform(delete("/api/me/friends/" + author.handle()).with(csrf()));
        assertThat(ids(liked(reader, null))).containsExactly(pub);
        assertThat(reader.http().perform(get("/api/me/liked-posts")).andReturn().getResponse().getHeader("Cache-Control")).contains("no-store");

        // 9개씩 이어 받는다
        List<Long> more = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            long id = publish(author, "글" + i, "PUBLIC");
            like(reader, id);
            more.addFirst(id);
        }
        JsonNode first = liked(reader, null);
        assertThat(ids(first)).containsExactlyElementsOf(more.subList(0, 9));
        JsonNode second = liked(reader, first.path("nextCursor").asString());
        assertThat(ids(second)).containsExactly(more.get(9), pub);
        assertThat(second.path("nextCursor").isNull()).isTrue();

        browser().perform(get("/api/me/liked-posts")).andExpect(status().isUnauthorized());
    }
}
