package com.team.blog.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

/**
 * 통합 테스트 기반: 실제 PostgreSQL·Redis, MockMvc, 개발용 로그인으로 GitHub 가입 흐름을 그대로 탄다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTest {
    private static final AtomicLong SEQ = new AtomicLong(System.nanoTime() % 1_000_000);

    @Autowired protected MockMvc mvc;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected StringRedisTemplate redis;
    protected final JsonMapper json = JsonMapper.builder().build();

    @DynamicPropertySource
    static void containers(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", Containers.POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", Containers.POSTGRES::getUsername);
        r.add("spring.datasource.password", Containers.POSTGRES::getPassword);
        r.add("spring.data.redis.host", Containers.REDIS::getHost);
        r.add("spring.data.redis.port", () -> Containers.REDIS.getMappedPort(6379));
    }

    @BeforeEach
    void resetRateLimits() {
        var keys = redis.keys("rl:*");
        if (keys != null && !keys.isEmpty()) redis.delete(keys);
    }

    /** 테스트마다 겹치지 않는 GitHub 아이디. */
    protected static String uniqueLogin(String base) {
        return base + SEQ.incrementAndGet();
    }

    protected Browser browser() {
        return new Browser(mvc);
    }

    /** GitHub 인증만 마친 가입 대기 브라우저. */
    protected Browser githubAuthenticated(String githubId, String login, String name, String email) throws Exception {
        Browser b = browser();
        Map<String, Object> body = new java.util.HashMap<>(Map.of("providerUserId", githubId, "login", login, "name", name == null ? "" : name));
        if (email != null) body.put("email", email);
        b.perform(asJson(post("/api/dev/login"), body)).andExpect(status().isOk());
        return b;
    }

    /** 이미 가입한 GitHub 계정으로 새 브라우저에서 로그인. */
    protected Browser relogin(Session s) throws Exception {
        Browser b = browser();
        b.perform(asJson(post("/api/dev/login"), Map.of("providerUserId", s.githubId(), "login", "x", "name", "x", "email", "x@example.com")))
                .andExpect(status().isOk());
        return b;
    }

    /** 가입까지 마친 로그인 브라우저. */
    protected Session signup(String login) throws Exception {
        String letters = login.replaceAll("[^a-zA-Z0-9]", "");
        return signup(login, "닉" + letters.substring(Math.max(0, letters.length() - 7)));
    }

    protected Session signup(String login, String nickname) throws Exception {
        String githubId = String.valueOf(SEQ.incrementAndGet() + 10_000_000L);
        Browser b = githubAuthenticated(githubId, login, login, login.toLowerCase() + "@example.com");
        String body = login.toLowerCase().replace('-', '_');
        b.perform(asJson(post("/api/auth/signup"), Map.of("handleBody", body, "nickname", nickname,
                        "agreeTerms", true, "agreePrivacy", true)))
                .andExpect(status().isCreated());
        JsonNode me = read(b.perform(get("/api/auth/me")).andReturn());
        return new Session(b, me.path("member").path("id").asLong(), me.path("member").path("handle").asString(), githubId);
    }

    protected JsonNode read(MvcResult r) throws Exception {
        String s = r.getResponse().getContentAsString();
        return s.isEmpty() ? json.createObjectNode() : json.readTree(s);
    }

    protected MockHttpServletRequestBuilder asJson(MockHttpServletRequestBuilder b, Object body) {
        return b.with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
    }

    public record Session(Browser http, long memberId, String handle, String githubId) {}

}
