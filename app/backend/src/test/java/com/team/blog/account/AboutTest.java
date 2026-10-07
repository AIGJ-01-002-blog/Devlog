package com.team.blog.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import tools.jackson.databind.JsonNode;

import com.team.blog.account.application.WithdrawalPurgeStep;
import com.team.blog.support.IntegrationTest;

/** spec 042: 블로그 [소개] 탭. 누구나 읽고 본인만 고친다. */
class AboutTest extends IntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired List<WithdrawalPurgeStep> purgeSteps;

    ResultActions save(Session s, String md) throws Exception {
        return s.http().perform(asJson(put("/api/me/about"), Map.of("contentMd", md)));
    }

    JsonNode about(Session viewer, String handle) throws Exception {
        var req = get("/api/members/" + handle + "/about");
        return read((viewer == null ? browser().perform(req) : viewer.http().perform(req)).andExpect(status().isOk()).andReturn());
    }

    @Test
    void 쓰면_누구나_HTML로_읽고_원문은_본인만_받는다() throws Exception {
        Session me = signup(uniqueLogin("ab"));
        JsonNode empty = about(me, me.handle());
        assertThat(empty.has("html")).isFalse();
        assertThat(empty.path("contentMd").asString()).isEmpty();
        assertThat(empty.path("mine").asBoolean()).isTrue();
        assertThat(about(null, me.handle()).has("contentMd")).isFalse();

        save(me, "  ## 안녕하세요\r\n\r\n백엔드 개발자입니다.<script>alert(1)</script>  ").andExpect(status().isNoContent());

        JsonNode anon = about(null, me.handle());
        assertThat(anon.path("html").asString()).contains("<h3", "안녕하세요", "백엔드 개발자입니다.").doesNotContain("<script");
        assertThat(anon.has("contentMd")).isFalse();
        assertThat(anon.path("mine").asBoolean()).isFalse();
        assertThat(anon.path("updatedAt").isMissingNode()).isFalse();
        // 앞뒤 공백을 빼고 줄바꿈을 맞춰 저장한다
        assertThat(about(me, me.handle()).path("contentMd").asString())
                .isEqualTo("## 안녕하세요\n\n백엔드 개발자입니다.<script>alert(1)</script>");

        // 고치면 새 내용을 보인다 (캐시 키가 바뀜)
        save(me, "고친 소개").andExpect(status().isNoContent());
        assertThat(about(null, me.handle()).path("html").asString()).contains("고친 소개").doesNotContain("안녕하세요");

        // 비우면 지운다
        save(me, "   ").andExpect(status().isNoContent());
        assertThat(about(null, me.handle()).has("html")).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM member_about WHERE member_id = ?", Long.class, me.memberId())).isZero();

        // 지운 뒤 다시 써도 예전 소개가 캐시에서 나오지 않는다 (리뷰 지적: 행을 새로 만들면 버전이 처음으로 돌아갔다)
        save(me, "다시 쓴 소개").andExpect(status().isNoContent());
        assertThat(about(null, me.handle()).path("html").asString()).contains("다시 쓴 소개").doesNotContain("안녕하세요");
    }

    @Test
    void 길이와_권한과_없는_주소() throws Exception {
        Session me = signup(uniqueLogin("abl"));
        save(me, "가".repeat(10_000)).andExpect(status().isNoContent());
        String body = save(me, "가".repeat(10_001)).andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();
        assertThat(body).contains("ABOUT_TOO_LONG");
        assertThat(about(null, me.handle()).path("html").asString()).contains("가".repeat(100)); // 앞 값이 그대로

        browser().perform(asJson(put("/api/me/about"), Map.of("contentMd", "남의 소개"))).andExpect(status().isUnauthorized());
        browser().perform(get("/api/members/nobody_here_404/about")).andExpect(status().isNotFound());
    }

    @Test
    void 서버가_그린_소개_페이지는_소개가_있을_때만_수집한다() throws Exception {
        Session me = signup(uniqueLogin("abs"));
        String empty = browser().perform(get("/@" + me.handle() + "/about")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(empty).contains("noindex");
        save(me, "**검색에 보일 소개**").andExpect(status().isNoContent());
        String page = browser().perform(get("/@" + me.handle() + "/about")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(page).contains("<strong>검색에 보일 소개</strong>", "/@" + me.handle() + "/about").doesNotContain("noindex");
        browser().perform(get("/@nobody_here_404/about")).andExpect(status().isNotFound());
    }

    @Test
    void 탈퇴_정리_때_지운다() throws Exception {
        Session me = signup(uniqueLogin("abw"));
        save(me, "곧 탈퇴").andExpect(status().isNoContent());
        purgeSteps.stream().filter(s -> s.getClass().getSimpleName().equals("AboutWithdrawalPurgeStep"))
                .findFirst().orElseThrow().purge(me.memberId());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM member_about WHERE member_id = ?", Long.class, me.memberId())).isZero();
    }
}
