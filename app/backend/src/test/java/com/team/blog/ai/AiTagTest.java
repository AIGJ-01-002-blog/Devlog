package com.team.blog.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.FakeAi;
import com.team.blog.support.IntegrationTest;

/** AI 태그 추천 (018): 동의·권한·걸러내기·결과 재사용·공급자 전환·하루 한도. 공급자는 가짜 서버다. */
class AiTagTest extends IntegrationTest {
    private static final FakeAi AI = FakeAi.INSTANCE;
    private static final String BODY = """
            # Spring Boot로 REST API 만들기

            이 글에서는 **Spring Boot**와 [JPA](https://spring.io/projects/spring-data-jpa)로 게시판 API를 만들어 봅니다.
            ![구조도](https://img.example/arch.png)

            ```java
            @RestController
            class PostController {
                @GetMapping("/posts") List<Post> list() { return repo.findAll(); }
            }
            ```

            - 컨트롤러는 요청만 받고
            - 서비스가 트랜잭션을 맡고
            - 저장소는 PostgreSQL에 씁니다.

            > 테스트는 Testcontainers로 실제 데이터베이스를 띄워서 돌립니다.
            """;

    @BeforeEach
    void clean() {
        AI.reset();
        Set<String> keys = redis.keys("ai:*");
        if (keys != null && !keys.isEmpty()) redis.delete(keys);
    }

    private Session agreed(String name) throws Exception {
        Session s = signup(uniqueLogin(name));
        s.http().perform(post("/api/me/agreements/ai").with(csrf())).andExpect(status().isNoContent());
        return s;
    }

    private long draft(Session s) throws Exception {
        return read(s.http().perform(asJson(post("/api/posts"), Map.of("title", "스프링", "contentMd", "x")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
    }

    private ResultActions suggest(Session s, long postId, String content, List<String> tags, boolean again) throws Exception {
        return s.http().perform(asJson(post("/api/posts/" + postId + "/ai-tags"),
                Map.of("title", "Spring Boot REST API", "content", content, "tags", tags, "again", again)));
    }

    private JsonNode ok(ResultActions r) throws Exception {
        return read(r.andExpect(status().isOk()).andReturn());
    }

    private static List<String> names(JsonNode res) {
        List<String> out = new ArrayList<>();
        res.path("tags").forEach(t -> out.add(t.asString()));
        return out;
    }

    private String code(ResultActions r, int status) throws Exception {
        return read(r.andExpect(status().is(status)).andReturn()).path("code").asString();
    }

    @Test
    void 동의하지_않으면_아무것도_보내지_않고_동의하면_추천한다() throws Exception {
        Session s = signup(uniqueLogin("aiconsent"));
        long id = draft(s);
        JsonNode st = read(s.http().perform(get("/api/ai/tags/status")).andExpect(status().isOk()).andReturn());
        assertThat(st.path("enabled").asBoolean()).isTrue();
        assertThat(st.path("agreed").asBoolean()).isFalse();
        assertThat(st.path("remaining").asInt()).isEqualTo(20);
        assertThat(st.path("provider").asString()).isEqualTo("GEMINI");

        assertThat(code(suggest(s, id, BODY, List.of(), false), 403)).isEqualTo("AI_CONSENT_REQUIRED");
        assertThat(AI.geminiRequests).isEmpty();
        assertThat(AI.localRequests).isEmpty();

        s.http().perform(post("/api/me/agreements/ai").with(csrf())).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT version FROM member_agreement WHERE member_id = ? AND type = 'AI'", String.class, s.memberId()))
                .isEqualTo("1");
        AI.nextGemini(FakeAi.geminiText("{\"tags\":[\"Spring Boot\",\"jpa\",\"spring boot\",\"시발공부\",\"java\"]}"));
        JsonNode res = ok(suggest(s, id, BODY, List.of("java"), false));
        // 대문자·공백 정리, 중복·금칙어·규칙 위반·이미 붙인 태그 제외
        assertThat(names(res)).containsExactly("spring-boot", "jpa");
        assertThat(res.path("cached").asBoolean()).isFalse();
        assertThat(res.path("provider").asString()).isEqualTo("GEMINI");
        assertThat(res.path("remaining").asInt()).isEqualTo(19);

        // 보낸 내용: 정리한 본문, 사진 주소·링크 주소 없음, 열쇠값은 머리글로만
        String sent = AI.geminiRequests.getFirst();
        assertThat(sent).contains("Spring Boot와 JPA로 게시판 API").contains("이미 붙인 태그: java")
                .doesNotContain("img.example").doesNotContain("spring.io").doesNotContain("test-gemini-key")
                .doesNotContain(s.handle());
        assertThat(AI.geminiKeys).containsExactly("test-gemini-key");

        // 철회하면 다시 동의가 필요하다
        s.http().perform(delete("/api/me/agreements/ai").with(csrf())).andExpect(status().isNoContent());
        assertThat(code(suggest(s, id, BODY, List.of(), false), 403)).isEqualTo("AI_CONSENT_REQUIRED");
    }

    @Test
    void 같은_내용과_조금_고친_내용은_저장된_결과로_답하고_횟수가_줄지_않는다() throws Exception {
        Session s = agreed("aicache");
        long id = draft(s);
        AI.nextGemini(FakeAi.geminiText("{\"tags\":[\"spring-boot\",\"jpa\",\"postgresql\"]}"));
        assertThat(names(ok(suggest(s, id, BODY, List.of(), false)))).containsExactly("spring-boot", "jpa", "postgresql");

        // 공백·사진 주소만 바뀐 글은 같은 내용
        String reformatted = BODY.replace("arch.png", "arch-v2.png").replace("\n\n", "\n\n\n");
        JsonNode same = ok(suggest(s, id, reformatted, List.of("jpa"), false));
        assertThat(same.path("cached").asBoolean()).isTrue();
        assertThat(names(same)).containsExactly("spring-boot", "postgresql");
        assertThat(same.path("remaining").asInt()).isEqualTo(19);

        // 오타 두 개를 고치면 같은 글의 비슷한 내용으로 재사용
        JsonNode similar = ok(suggest(s, id, BODY.replace("게시판", "게시글").replace("트랜잭션을", "트랜젝션을"), List.of(), false));
        assertThat(similar.path("cached").asBoolean()).isTrue();
        assertThat(AI.geminiRequests).hasSize(1);

        // [다시 추천]은 비슷한 내용 재사용을 건너뛴다
        AI.nextGemini(FakeAi.geminiText("{\"tags\":[\"rest-api\"]}"));
        JsonNode again = ok(suggest(s, id, BODY.replace("게시판", "게시글").replace("트랜잭션을", "트랜젝션을"), List.of(), true));
        assertThat(again.path("cached").asBoolean()).isFalse();
        assertThat(names(again)).containsExactly("rest-api");

        // 많이 고치면 새로 묻는다
        AI.nextGemini(FakeAi.geminiText("{\"tags\":[\"kotlin\"]}"));
        String rewritten = "Kotlin 코루틴으로 비동기 코드를 짜는 방법을 정리했습니다. ".repeat(4) + "suspend 함수와 Flow, 구조화된 동시성을 차례로 봅니다.";
        assertThat(names(ok(suggest(s, id, rewritten, List.of(), false)))).containsExactly("kotlin");
        assertThat(AI.geminiRequests).hasSize(3);

        // 다른 사람이 똑같은 글을 올리면 같은 내용 결과를 재사용한다
        Session other = agreed("aicache2");
        JsonNode reused = ok(suggest(other, draft(other), BODY, List.of(), false));
        assertThat(reused.path("cached").asBoolean()).isTrue();
        assertThat(AI.geminiRequests).hasSize(3);
    }

    @Test
    void 짧은_글_남의_글_형식_오류_모두_걸러진_결과() throws Exception {
        Session s = agreed("aishort");
        long id = draft(s);
        assertThat(code(suggest(s, id, "## 짧은 글\n\n![사진](https://img.example/a.png) 조금만 썼어요", List.of(), false), 400))
                .isEqualTo("AI_TOO_SHORT");

        Session other = agreed("aishort2");
        assertThat(code(suggest(other, id, BODY, List.of(), false), 404)).isEqualTo("NOT_FOUND");
        assertThat(AI.geminiRequests).isEmpty();

        // 형식에 맞지 않으면 실패, 저장하지 않는다
        AI.nextGemini(FakeAi.geminiText("태그는 spring입니다"));
        assertThat(code(suggest(s, id, BODY, List.of(), false), 503)).isEqualTo("AI_UNAVAILABLE");
        // 모두 걸러지면 빈 목록, 저장하지 않는다
        AI.nextGemini(FakeAi.geminiText("{\"tags\":[\"시발\",\"!!\"]}"));
        JsonNode empty = ok(suggest(s, id, BODY, List.of(), false));
        assertThat(names(empty)).isEmpty();
        AI.nextGemini(FakeAi.geminiText("{\"tags\":[\"spring\"]}"));
        assertThat(names(ok(suggest(s, id, BODY, List.of(), false)))).containsExactly("spring");
        assertThat(AI.geminiRequests).hasSize(3);
    }

    @Test
    void 외부_AI_하루_한도면_같은_요청을_자체_AI로_처리하고_계속_자체_AI를_쓴다() throws Exception {
        Session s = agreed("aiquota");
        long id = draft(s);
        AI.nextGemini(new FakeAi.Reply(429, "{\"error\":{\"code\":429,\"details\":[{\"violations\":[{\"quotaId\":\"GenerateRequestsPerDayPerProjectPerModel-FreeTier\"}]}]}}"));
        AI.nextLocal(FakeAi.localText("```json\n{\"tags\":[\"spring-boot\"]}\n```"));
        JsonNode res = ok(suggest(s, id, BODY, List.of(), false));
        assertThat(res.path("provider").asString()).isEqualTo("LOCAL");
        assertThat(names(res)).containsExactly("spring-boot");
        assertThat(AI.localRequests).hasSize(1);

        JsonNode st = read(s.http().perform(get("/api/ai/tags/status")).andReturn());
        assertThat(st.path("provider").asString()).isEqualTo("LOCAL");
        ok(suggest(s, id, BODY + "\n\n" + "Gradle 대신 Maven으로 빌드하고 Docker 이미지로 배포까지 이어 갑니다. ".repeat(10), List.of(), true));
        assertThat(AI.geminiRequests).hasSize(1);
        assertThat(AI.localRequests).hasSize(2);

        // [다시 추천]: 같은 내용 결과가 자체 AI 것이고 외부 AI를 다시 쓸 수 있으면 외부 AI로 다시 만든다
        Set<String> exhausted = redis.keys("ai:gemini:exhausted:*");
        redis.delete(exhausted);
        AI.nextGemini(FakeAi.geminiText("{\"tags\":[\"spring-boot\",\"java\"]}"));
        JsonNode upgraded = ok(suggest(s, id, BODY, List.of(), true));
        assertThat(upgraded.path("provider").asString()).isEqualTo("GEMINI");
        assertThat(names(upgraded)).containsExactly("spring-boot", "java");
    }

    @Test
    void 외부_AI_오류면_이번_요청은_실패하고_60초_동안_자체_AI를_쓴다() throws Exception {
        Session s = agreed("aierror");
        long id = draft(s);
        AI.nextGemini(new FakeAi.Reply(500, "{}"));
        assertThat(code(suggest(s, id, BODY, List.of(), false), 503)).isEqualTo("AI_UNAVAILABLE");
        assertThat(AI.localRequests).isEmpty();
        assertThat(redis.hasKey("ai:gemini:cooldown")).isTrue();
        assertThat(ok(suggest(s, id, BODY, List.of(), false)).path("provider").asString()).isEqualTo("LOCAL");

        // 종류를 모르는 한도 초과가 같은 날 세 번이면 하루 한도 소진으로 본다
        for (int i = 0; i < 3; i++) {
            redis.delete("ai:gemini:cooldown");
            AI.nextGemini(new FakeAi.Reply(429, "{\"error\":{\"code\":429}}"));
            ok(suggest(s, id, BODY + " 추가 문단 " + "새 내용을 많이 덧붙였어요. ".repeat(20 * (i + 1)), List.of(), true));
        }
        assertThat(redis.keys("ai:gemini:exhausted:*")).hasSize(1);
    }

    @Test
    void 개인_하루_한도를_넘으면_새로_묻지_않지만_저장된_결과는_쓴다() throws Exception {
        Session s = agreed("ailimit");
        long id = draft(s);
        ok(suggest(s, id, BODY, List.of(), false));
        String day = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).toString();
        redis.opsForValue().set("ai:user:" + s.memberId() + ":" + day, "20");
        assertThat(code(suggest(s, id, "완전히 다른 글입니다. ".repeat(20), List.of(), false), 429)).isEqualTo("AI_DAILY_LIMIT");
        JsonNode cached = ok(suggest(s, id, BODY, List.of(), false));
        assertThat(cached.path("cached").asBoolean()).isTrue();
        assertThat(cached.path("remaining").asInt()).isZero();
    }
}
