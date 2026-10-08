package com.team.blog.revision;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.IntegrationTest;

/** spec 054 글 수정 이력. */
class PostRevisionTest extends IntegrationTest {

    long newPost(Session s) throws Exception {
        return read(s.http().perform(asJson(post("/api/posts"), Map.of("title", "초안", "contentMd", "")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    long publish(Session s, long id, String title, String content, long base) throws Exception {
        return read(s.http().perform(asJson(post("/api/posts/" + id + "/publish"),
                        Map.of("title", title, "contentMd", content, "visibility", "PUBLIC", "baseVersion", base, "tags", List.of())))
                .andExpect(status().isOk()).andReturn()).path("version").asLong();
    }

    @Test
    void 발행할_때마다_판이_쌓이고_최신_판이_먼저_온다() throws Exception {
        Session s = signup(uniqueLogin("rev"));
        long id = newPost(s);
        long v = publish(s, id, "첫 제목", "첫 본문", 0);
        publish(s, id, "고친 제목", "고친 본문\n둘째 줄", v);

        JsonNode list = read(s.http().perform(get("/api/posts/" + id + "/revisions")).andExpect(status().isOk()).andReturn());
        assertThat(list).hasSize(2);
        assertThat(list.get(0).path("no").asInt()).isEqualTo(2);
        assertThat(list.get(0).path("title").asString()).isEqualTo("고친 제목");
        assertThat(list.get(1).path("length").asInt()).isEqualTo("첫 본문".length());

        JsonNode first = read(s.http().perform(get("/api/posts/" + id + "/revisions/1")).andExpect(status().isOk()).andReturn());
        assertThat(first.path("contentMd").asString()).isEqualTo("첫 본문");
        assertThat(first.path("title").asString()).isEqualTo("첫 제목");
    }

    @Test
    void 임시글_저장은_판을_만들지_않는다() throws Exception {
        Session s = signup(uniqueLogin("revdraft"));
        long id = newPost(s);
        JsonNode list = read(s.http().perform(get("/api/posts/" + id + "/revisions")).andExpect(status().isOk()).andReturn());
        assertThat(list).isEmpty();
    }

    @Test
    void 남의_글_이력은_404이고_로그인하지_않으면_401이다() throws Exception {
        Session owner = signup(uniqueLogin("revown"));
        Session other = signup(uniqueLogin("revoth"));
        long id = newPost(owner);
        publish(owner, id, "제목", "본문", 0);

        other.http().perform(get("/api/posts/" + id + "/revisions")).andExpect(status().isNotFound());
        other.http().perform(get("/api/posts/" + id + "/revisions/1")).andExpect(status().isNotFound());
        owner.http().perform(get("/api/posts/" + id + "/revisions/99")).andExpect(status().isNotFound());
        owner.http().perform(get("/api/posts/abc/revisions")).andExpect(status().isNotFound());
        browser().perform(get("/api/posts/" + id + "/revisions")).andExpect(status().isUnauthorized());
    }

    @Test
    void 판은_글마다_최근_50개만_남는다() throws Exception {
        Session s = signup(uniqueLogin("revkeep"));
        long id = newPost(s);
        long v = publish(s, id, "제목", "본문 0", 0);
        jdbc.update("""
                INSERT INTO post_revision (post_id, revision_no, title, content_md)
                SELECT ?, n, '옛 제목', '옛 본문' FROM generate_series(2, 60) n
                """, id);
        publish(s, id, "제목", "본문 61", v);

        List<Integer> nos = jdbc.queryForList("SELECT revision_no FROM post_revision WHERE post_id = ? ORDER BY revision_no", Integer.class, id);
        assertThat(nos).hasSize(50).startsWith(12).endsWith(61);
    }

    @Test
    void 글을_완전히_지우면_이력도_지워진다() throws Exception {
        Session s = signup(uniqueLogin("revpurge"));
        long id = newPost(s);
        publish(s, id, "제목", "본문", 0);
        jdbc.update("DELETE FROM post WHERE id = ?", id);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM post_revision WHERE post_id = ?", Integer.class, id)).isZero();
    }
}
