package com.team.blog.mcp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import tools.jackson.databind.JsonNode;

import com.team.blog.mcp.application.AiJournal;
import com.team.blog.support.IntegrationTest;

/**
 * spec 061: AI 글 제안(propose_post)과 자정 일기(add_note + 매일 00:00 묶기).
 */
class AiJournalTest extends IntegrationTest {
    static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Autowired
    AiJournal journal;

    String token(Session s) throws Exception {
        return read(s.http().perform(asJson(post("/api/me/tokens"), Map.of("name", "Claude Code", "scope", "WRITE")))
                .andExpect(status().isCreated()).andReturn()).path("secret").asString();
    }

    ResultActions rpc(String token, String method, Object params) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("jsonrpc", "2.0");
        body.put("id", 1);
        body.put("method", method);
        if (params != null) body.put("params", params);
        return mvc.perform(post("/api/mcp").contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + token)
                .content(json.writeValueAsString(body)));
    }

    JsonNode call(String token, String tool, Map<String, Object> args) throws Exception {
        return read(rpc(token, "tools/call", Map.of("name", tool, "arguments", args)).andExpect(status().isOk()).andReturn()).path("result");
    }

    List<String> toolNames(String token) throws Exception {
        return read(rpc(token, "tools/list", Map.of()).andExpect(status().isOk()).andReturn()).path("result").path("tools").findValuesAsString("name");
    }

    static String text(JsonNode result) {
        return result.path("content").get(0).path("text").asString();
    }

    void setDiary(Session s, boolean on) throws Exception {
        JsonNode r = read(s.http().perform(asJson(put("/api/me/ai-diary"), Map.of("enabled", on))).andExpect(status().isOk()).andReturn());
        assertThat(r.path("enabled").asBoolean()).isEqualTo(on);
    }

    @Test
    void AI가_제안한_글은_내_글_관리에서_임시글로_만들거나_넘긴다() throws Exception {
        Session me = signup(uniqueLogin("aiprop"));
        String t = token(me);
        assertThat(toolNames(t)).contains("propose_post", "list_post_proposals").doesNotContain("add_note");

        JsonNode r = call(t, "propose_post", Map.of("title", "  Redis 분산 락으로 중복 실행 막기 ", "scope",
                "- 왜 두 번 돌았나\n- SET NX와 만료\n- 뺄 것: Redisson 비교", "tags", List.of("redis", "Spring")));
        assertThat(r.path("isError").asBoolean()).as(text(r)).isFalse();
        // 같은 제목으로 다시 제안하면 새로 만들지 않고 범위를 바꾼다
        call(t, "propose_post", Map.of("title", "Redis 분산 락으로 중복 실행 막기", "scope", "- 바뀐 범위", "tags", List.of("redis")));
        call(t, "propose_post", Map.of("title", "넘길 제안", "scope", "- 아무거나"));
        assertThat(call(t, "propose_post", Map.of("title", "", "scope", "x")).path("isError").asBoolean()).isTrue();

        JsonNode list = read(me.http().perform(get("/api/me/ai-proposals")).andExpect(status().isOk()).andReturn());
        assertThat(list).hasSize(2);
        JsonNode redis = list.get(1);
        assertThat(redis.path("title").asString()).isEqualTo("Redis 분산 락으로 중복 실행 막기");
        assertThat(redis.path("scope").asString()).isEqualTo("- 바뀐 범위");
        long redisId = redis.path("id").asLong();
        long skipId = list.get(0).path("id").asLong();

        // 남이 정할 수 없다
        Session other = signup(uniqueLogin("aiprop2"));
        other.http().perform(post("/api/me/ai-proposals/" + redisId + "/draft").with(csrf())).andExpect(status().isNotFound());

        // [임시글로 만들기]는 두 번 눌러도 임시글 하나
        long postId = read(me.http().perform(post("/api/me/ai-proposals/" + redisId + "/draft").with(csrf())).andExpect(status().isOk()).andReturn())
                .path("postId").asLong();
        long again = read(me.http().perform(post("/api/me/ai-proposals/" + redisId + "/draft").with(csrf())).andExpect(status().isOk()).andReturn())
                .path("postId").asLong();
        assertThat(again).isEqualTo(postId);
        assertThat(jdbc.queryForObject("SELECT title FROM post WHERE id = ?", String.class, postId)).isEqualTo("Redis 분산 락으로 중복 실행 막기");
        assertThat(jdbc.queryForObject("SELECT content_md FROM post WHERE id = ?", String.class, postId)).contains("## 쓸 범위").contains("- 바뀐 범위");
        assertThat(jdbc.queryForObject("SELECT tags FROM post_ai_hint WHERE post_id = ?", String.class, postId)).isEqualTo("redis");

        me.http().perform(post("/api/me/ai-proposals/" + skipId + "/dismiss").with(csrf())).andExpect(status().isNoContent());
        assertThat(read(me.http().perform(get("/api/me/ai-proposals")).andExpect(status().isOk()).andReturn())).isEmpty();

        // AI는 임시글로 만든 제안을 보고 그 글을 채운다. 같은 제안으로 새 글을 또 만들지 않는다
        String seen = text(call(t, "list_post_proposals", Map.of()));
        assertThat(seen).contains("임시글 " + postId + "번으로 만듦").doesNotContain("넘길 제안");
        JsonNode dup = call(t, "create_draft", Map.of("title", "x", "content_md", "y", "proposal_id", redisId));
        assertThat(dup.path("isError").asBoolean()).isTrue();
        assertThat(text(dup)).contains("이미 임시글 " + postId + "번");

        // 대화에서 바로 쓰면 create_draft의 proposal_id로 제안이 닫힌다
        call(t, "propose_post", Map.of("title", "바로 쓸 제안", "scope", "- 범위"));
        long direct = journal.proposals(me.memberId(), false).getFirst().id();
        JsonNode made = call(t, "create_draft", Map.of("title", "바로 쓸 제안", "content_md", "본문", "proposal_id", direct));
        assertThat(made.path("isError").asBoolean()).as(text(made)).isFalse();
        assertThat(jdbc.queryForObject("SELECT status FROM ai_post_proposal WHERE id = ?", String.class, direct)).isEqualTo("DRAFTED");
        assertThat(jdbc.queryForObject("SELECT post_id FROM ai_post_proposal WHERE id = ?", Long.class, direct)).isNotNull();
    }

    @Test
    void 일기를_켜야_메모를_남기고_자정에_날짜별_일기_임시글로_묶는다() throws Exception {
        Session me = signup(uniqueLogin("aidiary"));
        String t = token(me);
        // 꺼져 있으면 도구가 보이지 않고, 이름을 알아도 부를 수 없다
        assertThat(read(me.http().perform(get("/api/me/ai-diary")).andExpect(status().isOk()).andReturn()).path("enabled").asBoolean()).isFalse();
        assertThat(toolNames(t)).doesNotContain("add_note");
        JsonNode off = call(t, "add_note", Map.of("content", "x"));
        assertThat(off.path("isError").asBoolean()).isTrue();
        assertThat(text(off)).contains("자정에 일기 쓰기");

        setDiary(me, true);
        assertThat(toolNames(t)).contains("add_note");
        JsonNode init = read(rpc(t, "initialize", Map.of("protocolVersion", "2025-06-18")).andReturn()).path("result");
        assertThat(init.path("instructions").asString()).contains("add_note").contains("propose_post").contains("포트폴리오용").contains("제 역할");

        JsonNode ok = call(t, "add_note", Map.of("topic", "검색", "content", "하이브리드 검색 가중치를 0.7로 정했다", "tags", List.of("search")));
        assertThat(ok.path("isError").asBoolean()).as(text(ok)).isFalse();
        assertThat(text(ok)).contains("오늘 1개");

        // 오늘 남긴 메모는 오늘 자정까지 기다린다. 어제·그제 메모는 날짜마다 일기 하나
        LocalDate today = LocalDate.now(KST);
        note(me.memberId(), "검색", "형태소 분석기를 바꿨다", "search", today.minusDays(1).atTime(10, 5));
        note(me.memberId(), null, "리뷰 답변을 정리했다", "", today.minusDays(1).atTime(9, 0));
        note(me.memberId(), "배포", "롤백 스크립트를 고쳤다\n둘째 줄", "k8s,search", today.minusDays(1).atTime(15, 30));
        note(me.memberId(), "배포", "카나리 비율을 정했다", "", today.minusDays(2).atTime(23, 59));

        assertThat(journal.compileDiaries()).isGreaterThanOrEqualTo(2);
        List<Map<String, Object>> posts = jdbc.queryForList("SELECT id, title, content_md, status FROM post WHERE author_id = ? ORDER BY id",
                me.memberId());
        assertThat(posts).hasSize(2);
        assertThat(posts.get(0).get("title")).isEqualTo(today.minusDays(2) + " 개발 일기");
        Map<String, Object> y = posts.get(1);
        assertThat(y.get("title")).isEqualTo(today.minusDays(1) + " 개발 일기");
        assertThat(y.get("status")).isEqualTo("DRAFT");
        assertThat((String) y.get("content_md")).isEqualTo("""
                ## 검색

                - 10:05 형태소 분석기를 바꿨다

                ## 배포

                - 15:30 롤백 스크립트를 고쳤다
                  둘째 줄

                ## 그 밖에

                - 09:00 리뷰 답변을 정리했다
                """);
        assertThat(jdbc.queryForObject("SELECT tags FROM post_ai_hint WHERE post_id = ?", String.class, y.get("id"))).isEqualTo("search,k8s");
        // 묶은 메모는 지우고 오늘 메모는 남긴다. 다시 돌아도 일기를 또 만들지 않는다
        assertThat(jdbc.queryForObject("SELECT count(*) FROM ai_note WHERE member_id = ?", Integer.class, me.memberId())).isEqualTo(1);
        journal.compileDiaries();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM post WHERE author_id = ?", Integer.class, me.memberId())).isEqualTo(2);

        // 끄면 남은 메모도 지운다
        setDiary(me, false);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM ai_note WHERE member_id = ?", Integer.class, me.memberId())).isZero();
    }

    @Test
    void 일기를_끈_회원과_메모가_없는_날은_일기를_만들지_않는다() throws Exception {
        Session off = signup(uniqueLogin("aidoff"));
        note(off.memberId(), "x", "켜 두지 않은 회원의 메모", "", LocalDate.now(KST).minusDays(1).atTime(12, 0));
        Session quiet = signup(uniqueLogin("aidq"));
        setDiary(quiet, true);
        journal.compileDiaries();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM post WHERE author_id IN (?, ?)", Integer.class, off.memberId(), quiet.memberId())).isZero();
    }

    @Test
    void 자정_작업이_동시에_돌아도_일기는_하나() throws Exception {
        Session me = signup(uniqueLogin("aidcc"));
        setDiary(me, true);
        for (int i = 0; i < 5; i++) note(me.memberId(), "동시", "메모 " + i, "", LocalDate.now(KST).minusDays(1).atTime(8, i));
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            List<Callable<Integer>> jobs = new ArrayList<>();
            for (int i = 0; i < 4; i++) jobs.add(journal::compileDiaries);
            for (Future<Integer> f : pool.invokeAll(jobs)) f.get();
        } finally {
            pool.shutdown();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM post WHERE author_id = ?", Integer.class, me.memberId())).isEqualTo(1);
        assertThat((String) jdbc.queryForObject("SELECT content_md FROM post WHERE author_id = ?", String.class, me.memberId()))
                .contains("메모 0").contains("메모 4");
    }

    void note(long memberId, String topic, String content, String tags, java.time.LocalDateTime at) {
        Instant when = at.atZone(KST).toInstant();
        jdbc.update("INSERT INTO ai_note (member_id, topic, content, tags, created_at) VALUES (?, ?, ?, ?, ?)",
                memberId, topic, content, tags, Timestamp.from(when));
    }
}
