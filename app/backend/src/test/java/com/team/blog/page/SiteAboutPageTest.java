package com.team.blog.page;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

import com.team.blog.support.IntegrationTest;

/** 077: 사이트 소개는 비회원도 열고 검색 엔진이 읽으며, 문의·약관·처리방침으로 잇는다. */
class SiteAboutPageTest extends IntegrationTest {

    @Test
    void 사이트_소개는_공개_화면이고_연락처와_처리방침을_잇는다() throws Exception {
        String page = mvc.perform(get("/about")).andExpect(status().isOk()).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        assertThat(page).contains("<link rel=\"canonical\" href=\"http://localhost:8080/about\">")
                .contains("<h1>devlog 소개</h1>")
                .contains("href=\"/support\"").contains("href=\"/privacy\"").contains("href=\"/terms\"")
                .contains("\"page\":\"about\"")
                .doesNotContain("noindex");
    }

    @Test
    void 운영자_주소_API는_비회원도_읽는다() throws Exception {
        mvc.perform(get("/api/site/about")).andExpect(status().isOk()).andExpect(jsonPath("$.ownerHandle").hasJsonPath());
    }

    @Test
    void 운영자_주소는_골뱅이와_대문자를_정리한다() {
        assertThat(new SiteOwner(" @Kim_Blog ").handle()).contains("kim_blog");
        assertThat(new SiteOwner("").handle()).isEmpty();
        assertThat(new SiteOwner(null).handle()).isEmpty();
    }
}
