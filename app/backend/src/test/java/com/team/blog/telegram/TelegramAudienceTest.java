package com.team.blog.telegram;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.FakeTelegram;
import com.team.blog.support.IntegrationTest;
import com.team.blog.telegram.application.TelegramBot;
import com.team.blog.telegram.infra.TelegramApi;

/** 기본 대상(관리자만): 일반 회원에게는 항목이 숨고 연결 주소도 받을 수 없다. 관리자는 연결된다. */
@TestPropertySource(properties = "blog.telegram.audience=ADMINS")
class TelegramAudienceTest extends IntegrationTest {
    @Autowired TelegramBot bot;

    @Test
    void 기본값이면_관리자만_연결할_수_있다() throws Exception {
        Session user = signup(uniqueLogin("tguser"));
        JsonNode s = read(user.http().perform(get("/api/me/telegram")).andExpect(status().isOk()).andReturn());
        assertThat(s.path("available").asBoolean()).isFalse();
        user.http().perform(post("/api/me/telegram/link").with(csrf())).andExpect(status().isForbidden());

        Session admin = signup(uniqueLogin("tgadmin"));
        jdbc.update("UPDATE member SET role = 'ADMIN' WHERE id = ?", admin.memberId());
        assertThat(read(admin.http().perform(get("/api/me/telegram")).andReturn()).path("available").asBoolean()).isTrue();
        String url = read(admin.http().perform(post("/api/me/telegram/link").with(csrf())).andExpect(status().isOk()).andReturn())
                .path("url").asString();
        long chat = 987_654_321L;
        bot.handle(new TelegramApi.Update(1, chat, "private", "/start " + url.substring(url.indexOf("start=") + 6), "민서"));
        assertThat(FakeTelegram.INSTANCE.await(chat, 1)).contains("블로그와 연결했어요");

        // 관리자에서 내려오면 남은 연결로도 메모·알림을 쓰지 않는다
        jdbc.update("UPDATE member SET role = 'USER' WHERE id = ?", admin.memberId());
        assertThat(read(admin.http().perform(get("/api/me/telegram")).andReturn()).path("available").asBoolean()).isFalse();
    }
}
