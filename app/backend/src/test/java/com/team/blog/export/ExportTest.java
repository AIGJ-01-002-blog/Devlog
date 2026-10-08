package com.team.blog.export;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import com.team.blog.support.IntegrationTest;

/** spec 059 내 글 내보내기. */
class ExportTest extends IntegrationTest {

    long newPost(Session s, String title, String content) throws Exception {
        return read(s.http().perform(asJson(post("/api/posts"), Map.of("title", title, "contentMd", content)))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    void publish(Session s, long id, String title, String content, List<String> tags) throws Exception {
        s.http().perform(asJson(post("/api/posts/" + id + "/publish"),
                        Map.of("title", title, "contentMd", content, "visibility", "PUBLIC", "baseVersion", 0, "tags", tags,
                                "summary", "짧은 \"소개\"")))
                .andExpect(status().isOk());
    }

    Map<String, String> unzip(byte[] bytes) throws Exception {
        Map<String, String> files = new LinkedHashMap<>();
        try (ZipInputStream z = new ZipInputStream(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8)) {
            for (ZipEntry e; (e = z.getNextEntry()) != null; ) files.put(e.getName(), new String(z.readAllBytes(), StandardCharsets.UTF_8));
        }
        return files;
    }

    byte[] download(Session s) throws Exception {
        MvcResult started = s.http().perform(get("/api/me/export.zip")).andExpect(request().asyncStarted()).andReturn();
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch(started))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/zip"))
                .andReturn().getResponse().getContentAsByteArray();
    }

    @Test
    void 발행한_글과_임시글을_머리말이_붙은_Markdown으로_묶는다() throws Exception {
        resetRateLimits();
        Session s = signup(uniqueLogin("export"));
        long pub = newPost(s, "초안", "");
        publish(s, pub, "JPA: N+1 정리", "## 문제\n지연 로딩", List.of("jpa", "spring"));
        long sid = read(s.http().perform(asJson(post("/api/me/series"), Map.of("name", "JPA 입문"))).andExpect(status().isOk())
                .andReturn()).path("id").asLong();
        s.http().perform(asJson(put("/api/posts/" + pub + "/series"), Map.of("seriesId", sid))).andExpect(status().is2xxSuccessful());
        newPost(s, "쓰는 중", "아직");
        long trashed = newPost(s, "지울 글", "x");
        jdbc.update("UPDATE post SET deleted_at = now() WHERE id = ?", trashed);

        assertThat(read(s.http().perform(get("/api/me/export")).andExpect(status().isOk()).andReturn()).path("posts").asInt()).isEqualTo(2);

        Map<String, String> files = unzip(download(s));
        assertThat(files).containsKey("README.md").hasSize(3);
        String published = files.entrySet().stream().filter(e -> e.getKey().startsWith("posts/")).findFirst().orElseThrow().getValue();
        assertThat(files.keySet()).anyMatch(n -> n.matches("posts/\\d{4}-\\d{2}-\\d{2}-" + pub + "-JPA-N\\+1-정리\\.md"));
        assertThat(published).startsWith("---\ntitle: \"JPA: N+1 정리\"\n")
                .contains("status: published\n", "tags: [\"jpa\", \"spring\"]\n", "series: \"JPA 입문\"\n", "summary: \"짧은 \\\"소개\\\"\"\n",
                        "/@" + s.handle() + "/posts/" + pub + "\"\n")
                .endsWith("---\n\n## 문제\n지연 로딩\n");
        assertThat(files.keySet()).anyMatch(n -> n.startsWith("drafts/") && n.endsWith("-쓰는-중.md"));
        assertThat(String.join("", files.values())).doesNotContain("지울 글");
        assertThat(files.get("README.md")).contains("글 2개", "— 임시글", "- [JPA: N+1 정리](<posts/");
    }

    @Test
    void 로그인하지_않으면_내보낼_수_없고_10분에_5번까지다() throws Exception {
        resetRateLimits();
        browser().perform(get("/api/me/export.zip")).andExpect(status().isUnauthorized());
        Session s = signup(uniqueLogin("exportrl"));
        for (int i = 0; i < 5; i++) download(s);
        s.http().perform(get("/api/me/export.zip")).andExpect(status().isTooManyRequests());
    }
}
