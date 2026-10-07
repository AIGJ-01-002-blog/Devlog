package com.team.blog.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.IntegrationTest;
import com.team.blog.support.TestImages;

/** spec 022 인수 시나리오: 첨부하고 발행(US1), 내려받기·읽기 판정(US2), 형식·개수 제한, 정리. */
class FileTest extends IntegrationTest {
    @Autowired PostImageCleanupJob cleanup;

    ResultActions upload(Session s, String name, byte[] data) throws Exception {
        return s.http().perform(post("/api/files").with(csrf()).contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header("X-File-Name", URLEncoder.encode(name, StandardCharsets.UTF_8)).content(data));
    }

    long uploaded(Session s, String name, byte[] data) throws Exception {
        return read(upload(s, name, data).andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    long draft(Session s) throws Exception {
        return read(s.http().perform(asJson(post("/api/posts"), Map.of("title", "첨부 글", "contentMd", "")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    ResultActions setFiles(Session s, long postId, List<Long> ids) throws Exception {
        return s.http().perform(asJson(put("/api/posts/" + postId + "/files"), Map.of("fileIds", ids)));
    }

    void publish(Session s, long id) throws Exception {
        s.http().perform(asJson(post("/api/posts/" + id + "/publish"), Map.of("title", "첨부 글 " + id, "contentMd", "본문",
                "visibility", "PUBLIC", "baseVersion", 0, "tags", List.of()))
                .header("Idempotency-Key", UUID.randomUUID().toString())).andExpect(status().isOk());
    }

    List<String> names(JsonNode list) {
        List<String> out = new ArrayList<>();
        list.forEach(n -> out.add(n.path("name").asString()));
        return out;
    }

    // ---------------------------------------------------------------- US1·US2

    @Test
    void 첨부하고_발행하면_비회원도_순서대로_보고_원래_이름으로_내려받는다() throws Exception {
        Session s = signup(uniqueLogin("file"));
        byte[] zip = TestFiles.zip("a.txt", "b.txt");
        long pdf = uploaded(s, "발표 자료 (최종).pdf", TestFiles.pdf());
        long z = uploaded(s, "src.zip", zip);
        String key = jdbc.queryForObject("SELECT storage_key FROM resource WHERE id = ?", String.class, pdf);
        assertThat(key).matches("files/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.pdf");

        long id = draft(s);
        JsonNode saved = read(setFiles(s, id, List.of(z, pdf)).andExpect(status().isOk()).andReturn());
        assertThat(names(saved)).containsExactly("src.zip", "발표 자료 (최종).pdf");
        // 임시글이면 다른 사람은 아직 못 본다
        browser().perform(get("/api/posts/" + id + "/files")).andExpect(status().isNotFound());
        publish(s, id);

        JsonNode list = read(browser().perform(get("/api/posts/" + id + "/files")).andExpect(status().isOk()).andReturn());
        assertThat(names(list)).containsExactly("src.zip", "발표 자료 (최종).pdf");
        assertThat(list.get(0).path("sizeBytes").asLong()).isEqualTo(zip.length);

        MvcResult d = browser().perform(get("/api/posts/" + id + "/files/" + pdf)).andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/octet-stream"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andReturn();
        assertThat(d.getResponse().getHeader("Content-Disposition"))
                .startsWith("attachment;").contains("filename*=UTF-8''" + "%EB%B0%9C%ED%91%9C");
        assertThat(d.getResponse().getHeader("Cache-Control")).contains("no-store");
        assertThat(d.getResponse().getContentAsByteArray()).isEqualTo(TestFiles.pdf());
        // 첨부는 공개 주소가 없다
        mvc.perform(get("/media/" + key)).andExpect(status().isNotFound());
        // 다른 글 번호로는 내려받을 수 없다
        long other = draft(s);
        publish(s, other);
        browser().perform(get("/api/posts/" + other + "/files/" + pdf)).andExpect(status().isNotFound());

        // 발행한 글에서도 바로 바뀐다. 뺀 파일은 연결 해제 시각이 남는다
        setFiles(s, id, List.of(pdf)).andExpect(status().isOk());
        assertThat(names(read(browser().perform(get("/api/posts/" + id + "/files")).andReturn()))).containsExactly("발표 자료 (최종).pdf");
        assertThat(jdbc.queryForObject("SELECT detached_at IS NOT NULL FROM resource WHERE id = ?", Boolean.class, z)).isTrue();
    }

    @Test
    void 비공개로_바꾸면_첨부도_작성자만_본다() throws Exception {
        Session s = signup(uniqueLogin("filepriv")), other = signup(uniqueLogin("filepeek"));
        long f = uploaded(s, "memo.txt", "비밀 메모".getBytes(StandardCharsets.UTF_8));
        long id = draft(s);
        setFiles(s, id, List.of(f)).andExpect(status().isOk());
        publish(s, id);
        s.http().perform(asJson(patch("/api/posts/" + id + "/visibility"), Map.of("visibility", "PRIVATE"))).andExpect(status().isOk());

        browser().perform(get("/api/posts/" + id + "/files")).andExpect(status().isNotFound());
        other.http().perform(get("/api/posts/" + id + "/files/" + f)).andExpect(status().isNotFound());
        s.http().perform(get("/api/posts/" + id + "/files/" + f)).andExpect(status().isOk());
        // 남의 글 첨부 목록은 바꿀 수 없다
        setFiles(other, id, List.of()).andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------- 제한

    @Test
    void 형식이_틀리거나_사진이거나_비었거나_너무_크면_거부하고_기록을_남기지_않는다() throws Exception {
        Session s = signup(uniqueLogin("filebad"));
        assertThat(upload(s, "run.exe", new byte[] {'M', 'Z', 1}).andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString()).contains("FILE_TYPE");
        assertThat(upload(s, "fake.pdf", TestFiles.zip("a")).andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString()).contains("FILE_TYPE_MISMATCH");
        assertThat(upload(s, "photo.pdf", TestImages.png(10, 10)).andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString()).contains("FILE_IS_IMAGE");
        upload(s, "empty.txt", new byte[0]).andExpect(status().isBadRequest());
        upload(s, "big.txt", new byte[PostFiles.MAX_BYTES + 1]).andExpect(status().isContentTooLarge());
        s.http().perform(post("/api/files").with(csrf()).content(TestFiles.pdf())).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM resource WHERE uploader_id = ?", Long.class, s.memberId())).isZero();
        browser().perform(post("/api/files").with(csrf()).header("X-File-Name", "a.pdf").content(TestFiles.pdf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 내가_올린_파일만_20개까지_붙일_수_있다() throws Exception {
        Session s = signup(uniqueLogin("filemax")), other = signup(uniqueLogin("filethief"));
        long theirs = uploaded(other, "남의 파일.txt", "x".getBytes(StandardCharsets.UTF_8));
        long id = draft(s);
        assertThat(setFiles(s, id, List.of(theirs)).andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString())
                .contains("FILE_NOT_OWNED");
        // 사진 리소스 번호도 첨부로 붙지 않는다
        long imageId = jdbc.queryForObject("""
                INSERT INTO resource (uploader_id, storage_key, content_type, size_bytes, kind)
                VALUES (?, ?, 'image/png', 10, 'IMAGE') RETURNING id""", Long.class, s.memberId(), "images/t/" + UUID.randomUUID() + ".png");
        setFiles(s, id, List.of(imageId)).andExpect(status().isBadRequest());

        List<Long> mine = new ArrayList<>();
        for (int i = 0; i < 21; i++) {
            mine.add(jdbc.queryForObject("""
                    WITH r AS (INSERT INTO resource (uploader_id, storage_key, content_type, size_bytes, kind)
                               VALUES (?, ?, 'text/plain', 1, 'FILE') RETURNING id)
                    INSERT INTO resource_file (resource_id, original_name) SELECT id, ? FROM r RETURNING resource_id
                    """, Long.class, s.memberId(), "files/t/" + UUID.randomUUID() + ".txt", "f" + i + ".txt"));
        }
        assertThat(setFiles(s, id, mine).andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString())
                .contains("TOO_MANY_FILES");
        setFiles(s, id, List.of(mine.get(0), mine.get(0))).andExpect(status().isBadRequest());
        setFiles(s, id, mine.subList(0, 20)).andExpect(status().isOk());
    }

    // ---------------------------------------------------------------- 정리

    @Test
    void 연결되지_않은_첨부는_하루_끊긴_첨부는_7일_뒤_지운다() throws Exception {
        Session s = signup(uniqueLogin("fileclean"));
        long unused = uploaded(s, "a.txt", "a".getBytes(StandardCharsets.UTF_8));
        long linked = uploaded(s, "b.txt", "b".getBytes(StandardCharsets.UTF_8));
        long detached = uploaded(s, "c.txt", "c".getBytes(StandardCharsets.UTF_8));
        long id = draft(s);
        setFiles(s, id, List.of(linked, detached)).andExpect(status().isOk());
        setFiles(s, id, List.of(linked)).andExpect(status().isOk());
        Instant now = Instant.now();
        jdbc.update("UPDATE resource SET created_at = ? WHERE id IN (?, ?, ?)", Timestamp.from(now.minus(3, ChronoUnit.DAYS)), unused, linked, detached);
        jdbc.update("UPDATE resource SET detached_at = ? WHERE id = ?", Timestamp.from(now.minus(8, ChronoUnit.DAYS)), detached);

        cleanup.runOnce();

        List<Long> left = jdbc.queryForList("SELECT id FROM resource WHERE uploader_id = ?", Long.class, s.memberId());
        assertThat(left).containsExactly(linked);
    }
}
