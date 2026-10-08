package com.team.blog.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import tools.jackson.databind.JsonNode;

import com.team.blog.shared.markdown.ImageUrls;
import com.team.blog.support.IntegrationTest;
import com.team.blog.support.TestImages;

/** spec 047: 발행할 때 썸네일을 직접 고르거나 없앤다. 고르지 않으면 지금처럼 본문 첫 사진이다. */
class PostThumbnailTest extends IntegrationTest {
    @Autowired PostImageCleanupJob cleanup;
    @Autowired ImageUrls imageUrls;

    JsonNode upload(Session s) throws Exception {
        byte[] thumb = TestImages.png(320, 200);
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        body.write(TestImages.png(800, 500));
        body.write(thumb);
        return read(s.http().perform(post("/api/images").with(csrf()).contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header("X-Thumbnail-Bytes", thumb.length).content(body.toByteArray())).andExpect(status().isCreated()).andReturn());
    }

    long create(Session s) throws Exception {
        return read(s.http().perform(asJson(post("/api/posts"), Map.of("title", "글", "contentMd", "")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    ResultActions publish(Session s, long id, String content, String thumbnailUrl, boolean hidden, long baseVersion) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "썸네일 글");
        body.put("contentMd", content);
        body.put("visibility", "PUBLIC");
        body.put("tags", List.of());
        body.put("baseVersion", baseVersion);
        body.put("thumbnailUrl", thumbnailUrl);
        body.put("thumbnailHidden", hidden);
        return s.http().perform(asJson(post("/api/posts/" + id + "/publish"), body)
                .header("Idempotency-Key", UUID.randomUUID().toString()));
    }

    long version(ResultActions r) throws Exception {
        return read(r.andExpect(status().isOk()).andReturn()).path("version").asLong();
    }

    /** 블로그 목록 카드의 대표 사진. 없으면 null */
    String cardThumb(Session s) throws Exception {
        JsonNode n = read(browser().perform(get("/api/members/" + s.handle() + "/posts")).andExpect(status().isOk()).andReturn())
                .path("items").get(0).path("thumbnailUrl");
        return n.isNull() || n.isMissingNode() ? null : n.asString();
    }

    JsonNode editor(Session s, long id) throws Exception {
        return read(s.http().perform(get("/api/posts/" + id + "/edit")).andExpect(status().isOk()).andReturn());
    }

    long resourceId(JsonNode uploaded) {
        return uploaded.path("id").asLong();
    }

    @Test
    void 고른_사진이_목록_대표_사진이_되고_없애면_사진이_없고_비우면_본문_첫_사진으로_돌아간다() throws Exception {
        Session me = signup(uniqueLogin("thumb"));
        JsonNode inBody = upload(me);
        JsonNode chosen = upload(me);
        String content = "본문\n\n![](" + inBody.path("url").asString() + ")";
        long id = create(me);

        long v = version(publish(me, id, content, chosen.path("url").asString(), false, 0));
        assertThat(cardThumb(me)).isEqualTo(chosen.path("thumbUrl").asString());
        assertThat(read(browser().perform(get("/api/posts/" + id)).andReturn()).path("thumbnailUrl").asString())
                .isEqualTo(chosen.path("thumbUrl").asString());
        // 공유 미리보기(og:image)도 고른 사진이다
        assertThat(browser().perform(get("/@" + me.handle() + "/posts/" + id)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8))
                .contains(chosen.path("thumbUrl").asString());
        // 다시 발행할 때 발행 설정 창을 미리 채운다
        JsonNode view = editor(me, id);
        assertThat(view.path("thumbnailUrl").asString()).isEqualTo(chosen.path("url").asString());
        assertThat(view.path("thumbnailHidden").asBoolean()).isFalse();

        // 없애면 본문에 사진이 있어도 대표 사진이 없고, 빠진 사진은 정리 대상이 된다
        v = version(publish(me, id, content, null, true, v));
        assertThat(cardThumb(me)).isNull();
        assertThat(editor(me, id).path("thumbnailHidden").asBoolean()).isTrue();
        assertThat(jdbc.queryForObject("SELECT detached_at IS NOT NULL FROM resource WHERE id = ?", Boolean.class, resourceId(chosen))).isTrue();

        // 고르지 않으면 본문 첫 사진
        publish(me, id, content, null, false, v).andExpect(status().isOk());
        assertThat(cardThumb(me)).isEqualTo(inBody.path("thumbUrl").asString());
        view = editor(me, id);
        assertThat(view.path("thumbnailUrl").isNull()).isTrue();
        assertThat(view.path("thumbnailHidden").asBoolean()).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM post_thumbnail WHERE post_id = ?", Long.class, id)).isZero();
    }

    @Test
    void 고른_썸네일은_본문에_없어도_사진_정리에서_지워지지_않는다() throws Exception {
        Session me = signup(uniqueLogin("thumbkeep"));
        JsonNode chosen = upload(me);
        long id = create(me);
        long v = version(publish(me, id, "사진 없는 본문", chosen.path("thumbUrl").asString(), false, 0));
        assertThat(cardThumb(me)).isEqualTo(chosen.path("thumbUrl").asString());

        jdbc.update("UPDATE resource SET created_at = now() - interval '3 days' WHERE id = ?", resourceId(chosen));
        cleanup.runOnce();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM resource WHERE id = ?", Long.class, resourceId(chosen))).isOne();

        // 다른 사진을 고르지 않게 되면 7일 뒤 지워진다
        publish(me, id, "사진 없는 본문", null, false, v).andExpect(status().isOk());
        jdbc.update("UPDATE resource SET detached_at = now() - interval '8 days' WHERE id = ?", resourceId(chosen));
        cleanup.runOnce();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM resource WHERE id = ?", Long.class, resourceId(chosen))).isZero();
        assertThat(cardThumb(me)).isNull();
    }

    @Test
    void 남의_사진이나_바깥_주소는_고를_수_없고_고르기와_없애기를_같이_보내면_거부한다() throws Exception {
        Session me = signup(uniqueLogin("thumbbad"));
        Session other = signup(uniqueLogin("thumboth"));
        JsonNode theirs = upload(other);
        JsonNode mine = upload(me);
        long id = create(me);

        String err = publish(me, id, "본문", theirs.path("url").asString(), false, 0).andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(err).contains("THUMBNAIL_INVALID");
        publish(me, id, "본문", "https://example.com/a.png", false, 0).andExpect(status().isBadRequest());
        err = publish(me, id, "본문", mine.path("url").asString(), true, 0).andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(err).contains("THUMBNAIL_CONFLICT");
        assertThat(jdbc.queryForObject("SELECT status FROM post WHERE id = ?", String.class, id)).isEqualTo("DRAFT");
    }
}
