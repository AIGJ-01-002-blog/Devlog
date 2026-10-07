package com.team.blog.tag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.IntegrationTest;

/** spec 010 인수 시나리오: 발행할 때 태그 달기(US1), 거부(US2), 태그별 목록(US3), 자동완성(US4), 블로그 필터(US5). */
class TagTest extends IntegrationTest {
    /** 테스트마다 겹치지 않는 태그 이름 조각 (전체 태그 목록·자동완성은 모든 테스트가 같은 DB를 쓴다). */
    static String unique(String base) {
        return base + Long.toString(System.nanoTime(), 36);
    }

    long draft(Session s, String title) throws Exception {
        return read(s.http().perform(asJson(post("/api/posts"), Map.of("title", title, "contentMd", "본문")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    ResultActions publish(Session s, long id, long baseVersion, String visibility, List<String> tags) throws Exception {
        return s.http().perform(asJson(post("/api/posts/" + id + "/publish"), Map.of("title", "글 " + id, "contentMd", "본문",
                "visibility", visibility, "baseVersion", baseVersion, "tags", tags))
                .header("Idempotency-Key", UUID.randomUUID().toString()));
    }

    long published(Session s, String visibility, String... tags) throws Exception {
        long id = draft(s, "글");
        publish(s, id, 0, visibility, List.of(tags)).andExpect(status().isOk());
        return id;
    }

    JsonNode detail(Session s, long id) throws Exception {
        return read(s.http().perform(get("/api/posts/" + id)).andExpect(status().isOk()).andReturn());
    }

    JsonNode tagPage(String name) throws Exception {
        return read(browser().perform(get(URI.create("/api/tags/" + encode(name) + "/posts"))).andExpect(status().isOk()).andReturn());
    }

    JsonNode suggest(Session s, String q) throws Exception {
        return read(s.http().perform(get("/api/tags/suggest").param("q", q)).andExpect(status().isOk()).andReturn());
    }

    static String encode(String name) {
        return URLEncoder.encode(name, StandardCharsets.UTF_8).replace("+", "%20").replace("%2B", "+").replace("%2E", ".");
    }

    static List<String> texts(JsonNode array, String field) {
        List<String> out = new ArrayList<>();
        array.forEach(n -> out.add(field == null ? n.asString() : n.path(field).asString()));
        return out;
    }

    static List<Long> ids(JsonNode page) {
        List<Long> out = new ArrayList<>();
        page.path("items").forEach(n -> out.add(n.path("id").asLong()));
        return out;
    }

    // ---------------------------------------------------------------- US1

    @Test
    void 발행하면_정규화한_태그가_입력_순서대로_붙고_다시_발행할_때_미리_채워진다() throws Exception {
        Session s = signup(uniqueLogin("tga"));
        String t = unique("t");
        long id = draft(s, "태그 글");
        publish(s, id, 0, "PUBLIC", List.of(t + " Boot", "#JPA" + t, "C#", t + "-boot", "#" + t.toUpperCase() + "  BOOT"))
                .andExpect(status().isOk());

        assertThat(texts(detail(s, id).path("tags"), null)).containsExactly(t + "-boot", "jpa" + t, "c#");
        JsonNode editor = read(s.http().perform(get("/api/posts/" + id + "/edit")).andExpect(status().isOk()).andReturn());
        assertThat(texts(editor.path("tags"), null)).containsExactly(t + "-boot", "jpa" + t, "c#");

        // 태그만 바꿔 다시 발행해도 "수정됨"이 붙고 태그가 통째로 바뀐다
        publish(s, id, editor.path("version").asLong(), "PUBLIC", List.of("c#", t)).andExpect(status().isOk());
        JsonNode again = detail(s, id);
        assertThat(texts(again.path("tags"), null)).containsExactly("c#", t);
        assertThat(again.path("editedAt").isNull()).isFalse();
        // 쓰는 글이 없어진 태그 행도 남는다 (FR-013)
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tag WHERE name = ?", Long.class, "jpa" + t)).isOne();
    }

    // ---------------------------------------------------------------- US2

    @Test
    void 문제가_있는_태그는_모두_위치와_이유를_알리고_발행하지_않는다() throws Exception {
        Session s = signup(uniqueLogin("tgb"));
        long id = draft(s, "거부");
        JsonNode body = read(publish(s, id, 0, "PUBLIC", List.of("ok", "🔥hot", "a".repeat(31), "시발공부", "ㅋㅋ"))
                .andExpect(status().isBadRequest()).andReturn());
        List<String> fields = new ArrayList<>();
        List<String> codes = new ArrayList<>();
        body.path("errors").forEach(e -> {
            fields.add(e.path("field").asString());
            codes.add(e.path("code").asString());
        });
        assertThat(fields).containsExactly("tags[1]", "tags[2]", "tags[3]", "tags[4]");
        assertThat(codes).containsExactly("INVALID_TAG", "TAG_TOO_LONG", "TAG_BANNED_WORD", "INVALID_TAG");
        assertThat(body.toString()).doesNotContain("시발");
        assertThat(jdbc.queryForObject("SELECT status FROM post WHERE id = ?", String.class, id)).isEqualTo("DRAFT");

        List<String> eleven = new ArrayList<>();
        for (int i = 0; i < 11; i++) eleven.add("tag" + i);
        JsonNode many = read(publish(s, id, 0, "PUBLIC", eleven).andExpect(status().isBadRequest()).andReturn());
        assertThat(many.path("errors").get(0).path("code").asString()).isEqualTo("TOO_MANY_TAGS");
        // 중복을 지운 뒤 10개면 통과한다
        List<String> ten = new ArrayList<>(eleven.subList(0, 10));
        ten.add("TAG0");
        publish(s, id, 0, "PUBLIC", ten).andExpect(status().isOk());
    }

    // ---------------------------------------------------------------- US3

    @Test
    void 태그_목록에는_공개_목록_조건의_글만_들어간다() throws Exception {
        Session a = signup(uniqueLogin("tgc")), gone = signup(uniqueLogin("tgd"));
        String t = unique("pub");
        long older = published(a, "PUBLIC", t);
        long newer = published(a, "PUBLIC", t);
        published(a, "PRIVATE", t);
        long trashed = published(a, "PUBLIC", t);
        a.http().perform(delete("/api/posts/" + trashed).with(csrf())).andExpect(status().isOk());
        long hidden = published(a, "PUBLIC", t);
        jdbc.update("UPDATE post SET hidden_at = now(), hidden_reason = 'SPAM' WHERE id = ?", hidden);
        published(gone, "PUBLIC", t);
        jdbc.update("UPDATE member SET withdrawn_at = now(), status = 'WITHDRAWN' WHERE id = ?", gone.memberId());

        JsonNode page = tagPage(t);
        assertThat(page.path("name").asString()).isEqualTo(t);
        assertThat(page.path("postCount").asLong()).isEqualTo(2);
        assertThat(ids(page)).containsExactly(newer, older);

        redis.delete("tags:top");
        JsonNode top = read(browser().perform(get("/api/tags")).andExpect(status().isOk()).andReturn());
        top.forEach(n -> {
            if (n.path("name").asString().equals(t)) assertThat(n.path("postCount").asLong()).isEqualTo(2);
        });
        assertThat(texts(top, "name")).contains(t);
    }

    @Test
    void 비공개_글에만_쓰인_태그는_아무도_안_쓴_태그와_구별되지_않는다() throws Exception {
        Session a = signup(uniqueLogin("tge"));
        String secret = unique("secret"), nobody = unique("nobody");
        published(a, "PRIVATE", secret);

        JsonNode s = tagPage(secret), n = tagPage(nobody);
        assertThat(s.path("postCount").asLong()).isZero();
        assertThat(s.path("items").size()).isZero();
        assertThat(s.toString().replace(secret, "X")).isEqualTo(n.toString().replace(nobody, "X"));
        redis.delete("tags:top");
        JsonNode top = read(browser().perform(get("/api/tags")).andExpect(status().isOk()).andReturn());
        assertThat(texts(top, "name")).doesNotContain(secret);
    }

    @Test
    void 허용_문자로_된_태그_주소는_실제_보안_설정을_거쳐_왕복된다() throws Exception {
        Session a = signup(uniqueLogin("tgf"));
        published(a, "PUBLIC", "c#", "c++", "node.js", ".net", "스프링-부트");
        for (String name : List.of("c#", "c++", "node.js", ".net", "스프링-부트")) {
            String path = "/tags/" + encode(name);
            String html = browser().perform(get(URI.create(path))).andExpect(status().isOk()).andReturn()
                    .getResponse().getContentAsString();
            assertThat(html).contains("#" + name);
            assertThat(tagPage(name).path("postCount").asLong()).isPositive();
        }
        browser().perform(get(URI.create("/tags/Spring%20Boot"))).andExpect(status().isMovedPermanently())
                .andExpect(r -> assertThat(r.getResponse().getHeader("Location")).isEqualTo("/tags/spring-boot"));
        browser().perform(get(URI.create("/tags/C%23"))).andExpect(status().isMovedPermanently())
                .andExpect(r -> assertThat(r.getResponse().getHeader("Location")).isEqualTo("/tags/c%23"));
        browser().perform(get(URI.create("/tags/%F0%9F%94%A5"))).andExpect(status().isNotFound());
        browser().perform(get(URI.create("/tags/..."))).andExpect(status().isNotFound());
        browser().perform(get(URI.create("/api/tags/%F0%9F%94%A5/posts"))).andExpect(status().isNotFound());
    }

    @Test
    void 글_상세_HTML에_태그가_인코딩된_링크로_보인다() throws Exception {
        Session a = signup(uniqueLogin("tgg"));
        long id = published(a, "PUBLIC", "c#", "node.js");
        String html = browser().perform(get("/@" + a.handle() + "/posts/" + id)).andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString();
        assertThat(html).contains("href=\"/tags/c%23\"").contains("href=\"/tags/node.js\"");
    }

    @Test
    void 같은_새_태그로_동시에_발행해도_태그는_하나다() throws Exception {
        Session a = signup(uniqueLogin("tgh"));
        String t = unique("race");
        List<Long> drafts = new ArrayList<>();
        for (int i = 0; i < 10; i++) drafts.add(draft(a, "동시 " + i));
        ExecutorService pool = Executors.newFixedThreadPool(10);
        try {
            List<Callable<Integer>> jobs = new ArrayList<>();
            for (long id : drafts) {
                jobs.add(() -> publish(a, id, 0, "PUBLIC", List.of(t, "공통" + t)).andReturn().getResponse().getStatus());
            }
            for (Future<Integer> f : pool.invokeAll(jobs)) assertThat(f.get()).isEqualTo(200);
        } finally {
            pool.shutdown();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tag WHERE name IN (?, ?)", Long.class, t, "공통" + t)).isEqualTo(2);
        assertThat(tagPage(t).path("postCount").asLong()).isEqualTo(10);
    }

    // ---------------------------------------------------------------- US4

    @Test
    void 자동완성은_내_태그와_공개_글의_태그만_내_것_먼저_보여준다() throws Exception {
        Session a = signup(uniqueLogin("tgi")), b = signup(uniqueLogin("tgj"));
        String p = unique("ac");
        published(a, "PRIVATE", p + "-secret");
        published(b, "PUBLIC", p + "-popular");
        published(b, "PUBLIC", p + "-popular");
        published(a, "PUBLIC", p + "-mine");

        JsonNode forA = suggest(a, p.toUpperCase());
        assertThat(texts(forA, "name")).containsExactly(p + "-mine", p + "-secret", p + "-popular");
        assertThat(forA.get(0).path("mine").asBoolean()).isTrue();
        assertThat(forA.get(2).path("postCount").asLong()).isEqualTo(2);

        JsonNode forB = suggest(b, p);
        assertThat(texts(forB, "name")).containsExactly(p + "-popular", p + "-mine");

        assertThat(suggest(a, "  ").size()).isZero();
        // _는 와일드카드가 아니다
        assertThat(suggest(a, p.substring(0, 2) + "_").size()).isZero();
        browser().perform(get("/api/tags/suggest").param("q", p)).andExpect(status().isUnauthorized());
    }

    // ---------------------------------------------------------------- US5

    @Test
    void 블로그_태그_줄과_필터는_그_블로그의_공개_글만_본다() throws Exception {
        Session a = signup(uniqueLogin("tgk")), viewer = signup(uniqueLogin("tgl"));
        String t = unique("jpa");
        long one = published(a, "PUBLIC", t, "spring");
        long two = published(a, "PUBLIC", t);
        published(a, "PRIVATE", t, "secret-only");
        published(viewer, "PUBLIC", t);

        JsonNode tags = read(a.http().perform(get("/api/members/" + a.handle() + "/tags")).andExpect(status().isOk()).andReturn());
        assertThat(texts(tags, "name")).containsExactly(t, "spring");
        assertThat(tags.get(0).path("postCount").asLong()).isEqualTo(2);

        JsonNode filtered = read(viewer.http().perform(get("/api/members/" + a.handle() + "/posts").param("tag", t))
                .andExpect(status().isOk()).andReturn());
        assertThat(ids(filtered)).containsExactly(two, one);

        browser().perform(get("/@" + a.handle()).param("tag", t.toUpperCase())).andExpect(status().isMovedPermanently())
                .andExpect(r -> assertThat(r.getResponse().getHeader("Location")).isEqualTo("/@" + a.handle() + "?tag=" + t));
        browser().perform(get("/@" + a.handle()).param("tag", t)).andExpect(status().isOk());
        browser().perform(get("/@" + a.handle()).param("tag", "🔥")).andExpect(status().isNotFound());
    }
}
