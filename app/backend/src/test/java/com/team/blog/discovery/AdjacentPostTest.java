package com.team.blog.discovery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.IntegrationTest;

/** spec 040: 글 상세 아래 이전·다음 글은 보는 사람의 블로그 목록 순서를 따른다. */
class AdjacentPostTest extends IntegrationTest {

    long publish(Session s, String title, String visibility) throws Exception {
        long id = read(s.http().perform(asJson(post("/api/posts"), Map.of("title", title, "contentMd", "본문")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
        s.http().perform(asJson(post("/api/posts/" + id + "/publish"), Map.of("title", title, "contentMd", "본문",
                        "visibility", visibility, "baseVersion", 0, "tags", List.of()))
                .header("Idempotency-Key", UUID.randomUUID().toString())).andExpect(status().isOk());
        return id;
    }

    MockHttpServletResponse adjacent(Session s, long postId) throws Exception {
        var req = get("/api/posts/" + postId + "/adjacent");
        return (s == null ? browser().perform(req) : s.http().perform(req)).andReturn().getResponse();
    }

    JsonNode ok(Session s, long postId) throws Exception {
        MockHttpServletResponse res = adjacent(s, postId);
        assertThat(res.getStatus()).isEqualTo(200);
        return json.readTree(res.getContentAsString());
    }

    static Long id(JsonNode link) {
        return link.isNull() || link.isMissingNode() ? null : link.path("id").asLong();
    }

    @Test
    void 공개_글은_작성자_블로그_순서로_이전_다음_글을_잇는다() throws Exception {
        Session s = signup(uniqueLogin("adj"));
        long p1 = publish(s, "첫 글", "PUBLIC");
        long p2 = publish(s, "둘째 글", "PUBLIC");
        long p3 = publish(s, "셋째 글", "PUBLIC");
        publish(signup(uniqueLogin("adjo")), "남의 글", "PUBLIC"); // 다른 작성자 글은 끼지 않는다

        JsonNode mid = ok(null, p2);
        assertThat(id(mid.path("prev"))).isEqualTo(p1);
        assertThat(id(mid.path("next"))).isEqualTo(p3);
        assertThat(mid.path("prev").path("title").asString()).isEqualTo("첫 글");
        assertThat(mid.path("next").path("url").asString()).isEqualTo("/@" + s.handle() + "/posts/" + p3);
        assertThat(mid.has("friendsView")).isFalse();

        assertThat(id(ok(null, p1).path("prev"))).isNull();
        assertThat(id(ok(null, p3).path("next"))).isNull();
        assertThat(adjacent(null, p2).getHeader("Cache-Control")).contains("no-cache").doesNotContain("no-store");

        // 휴지통으로 보낸 글은 건너뛴다
        s.http().perform(delete("/api/posts/" + p2).with(csrf())).andExpect(status().isOk());
        assertThat(id(ok(null, p1).path("next"))).isEqualTo(p3);
    }

    @Test
    void 친구에게는_친구_공개_글도_잇고_남에게는_건너뛴다() throws Exception {
        Session owner = signup(uniqueLogin("adjf"));
        Session friend = signup(uniqueLogin("adjg"));
        owner.http().perform(put("/api/me/friends/" + friend.handle()).with(csrf())).andExpect(status().isOk());
        friend.http().perform(post("/api/me/friends/" + owner.handle() + "/accept").with(csrf())).andExpect(status().isOk());
        long p1 = publish(owner, "공개 1", "PUBLIC");
        long f = publish(owner, "친구만", "FRIENDS");
        long p3 = publish(owner, "공개 2", "PUBLIC");

        JsonNode asFriend = ok(friend, p1);
        assertThat(id(asFriend.path("next"))).isEqualTo(f);
        assertThat(adjacent(friend, p1).getHeader("Cache-Control")).contains("no-store");
        JsonNode friendsPost = ok(friend, f);
        assertThat(id(friendsPost.path("prev"))).isEqualTo(p1);
        assertThat(id(friendsPost.path("next"))).isEqualTo(p3);

        assertThat(id(ok(null, p1).path("next"))).isEqualTo(p3);
        assertThat(adjacent(null, f).getStatus()).isEqualTo(404);
    }

    @Test
    void 목록에_없는_글은_이웃이_없고_읽을_수_없으면_404() throws Exception {
        Session s = signup(uniqueLogin("adjp"));
        long p1 = publish(s, "공개", "PUBLIC");
        long secret = publish(s, "비공개", "PRIVATE");
        long p3 = publish(s, "공개 2", "PUBLIC");

        JsonNode mine = ok(s, secret);
        assertThat(id(mine.path("prev"))).isNull();
        assertThat(id(mine.path("next"))).isNull();
        assertThat(adjacent(null, secret).getStatus()).isEqualTo(404);
        assertThat(adjacent(null, 999_999_999L).getStatus()).isEqualTo(404);
        assertThat(browser().perform(get("/api/posts/abc/adjacent")).andReturn().getResponse().getStatus()).isEqualTo(404);
        // 작성자 본인도 블로그처럼 공개 목록 순서를 본다 (비공개 글을 건너뜀)
        assertThat(id(ok(s, p1).path("next"))).isEqualTo(p3);
    }
}
