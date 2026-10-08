package com.team.blog.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

import tools.jackson.databind.JsonNode;

import com.team.blog.support.FakeAi;
import com.team.blog.support.IntegrationTest;

/**
 * 집 PC 먼저 (2026-10-08 민서님 답 4번 변경, spec 052): 집 PC Ollama가 켜져 있으면 먼저 쓰고, 꺼졌으면 외부 AI로 넘기며
 * 한동안 집 PC를 건너뛴다. 집 PC 요청에는 터널용 접근 헤더가 붙는다.
 */
@TestPropertySource(properties = {"blog.ai.prefer=local", "blog.ai.local.auth-token=test-home-token",
        "blog.ai.local.access-client-id=test-cf-id", "blog.ai.local.access-client-secret=test-cf-secret"})
class AiLocalFirstTest extends IntegrationTest {
    private static final FakeAi AI = FakeAi.INSTANCE;
    private static final String BODY = "Spring Boot와 PostgreSQL로 게시판 API를 만들고 Testcontainers로 시험합니다. ".repeat(4);

    @BeforeEach
    void clean() {
        AI.reset();
        Set<String> keys = redis.keys("ai:*");
        if (keys != null && !keys.isEmpty()) redis.delete(keys);
    }

    private JsonNode suggest(Session s, long id, String content) throws Exception {
        return read(s.http().perform(asJson(post("/api/posts/" + id + "/ai-tags"),
                Map.of("title", "Spring Boot REST API", "content", content, "tags", List.of(), "again", false)))
                .andExpect(status().isOk()).andReturn());
    }

    @Test
    void 집_PC가_켜져_있으면_먼저_쓰고_꺼지면_외부_AI로_넘긴다() throws Exception {
        Session s = signup(uniqueLogin("ailocal"));
        s.http().perform(post("/api/me/agreements/ai").with(csrf())).andExpect(status().isNoContent());
        long id = read(s.http().perform(asJson(post("/api/posts"), Map.of("title", "스프링", "contentMd", "x")))
                .andExpect(status().isCreated()).andReturn()).path("id").asLong();
        assertThat(read(s.http().perform(get("/api/ai/tags/status")).andReturn()).path("provider").asString()).isEqualTo("LOCAL");

        AI.nextLocal(FakeAi.localText("{\"tags\":[\"spring-boot\"]}"));
        JsonNode first = suggest(s, id, BODY);
        assertThat(first.path("provider").asString()).isEqualTo("LOCAL");
        assertThat(AI.geminiRequests).isEmpty();
        assertThat(AI.localAuth).containsExactly("Bearer test-home-token|test-cf-id");

        // 집 PC가 꺼짐(오류) → 같은 요청을 외부 AI가 처리하고, 한동안 집 PC를 건너뛴다
        AI.nextLocal(new FakeAi.Reply(502, "{}"));
        AI.nextGemini(FakeAi.geminiText("{\"tags\":[\"postgresql\"]}"));
        JsonNode second = suggest(s, id, "완전히 다른 내용: Redis 캐시와 Docker Compose 배포를 정리합니다. ".repeat(5));
        assertThat(second.path("provider").asString()).isEqualTo("GEMINI");
        assertThat(redis.hasKey("ai:local:down")).isTrue();
        assertThat(read(s.http().perform(get("/api/ai/tags/status")).andReturn()).path("provider").asString()).isEqualTo("GEMINI");

        suggest(s, id, "세 번째 내용: GitHub Actions로 이미지 빌드와 배포를 자동화합니다. ".repeat(5));
        assertThat(AI.localRequests).hasSize(2);
        assertThat(AI.geminiRequests).hasSize(2);

        // 다시 켜지면(건너뛰는 시간이 지나면) 집 PC로 돌아간다
        redis.delete("ai:local:down");
        suggest(s, id, "네 번째 내용: Kubernetes 매니페스트와 Cloudflare Tunnel을 붙입니다. ".repeat(5));
        assertThat(AI.localRequests).hasSize(3);
    }
}
