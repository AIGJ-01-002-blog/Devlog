package com.team.blog.shared.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpSession;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.shared.error.GlobalExceptionHandler;
import com.team.blog.shared.security.ResilientSessionFilter.SessionUnavailableException;

/** spec 036: 세션 저장소가 멈추면 읽기는 비로그인으로 계속, 새 세션이 필요한 요청은 503 "잠시 후 다시 시도" (001 FR-020). */
class ResilientSessionFilterTest {
    final ResilientSessionFilter filter = new ResilientSessionFilter();

    /** 세션 저장소가 멈춘 것처럼 세션 조회마다 예외를 던지고, 몇 번 물었는지 센다. */
    static final class StoreDown extends HttpServletRequestWrapper {
        final AtomicInteger calls = new AtomicInteger();
        final RuntimeException failure;

        StoreDown(HttpServletRequest request, RuntimeException failure) {
            super(request);
            this.failure = failure;
        }

        @Override
        public HttpSession getSession(boolean create) {
            calls.incrementAndGet();
            throw failure;
        }

        @Override
        public boolean isRequestedSessionIdValid() {
            calls.incrementAndGet();
            throw failure;
        }
    }

    HttpServletRequest pass(HttpServletRequest request) throws Exception {
        AtomicReference<HttpServletRequest> seen = new AtomicReference<>();
        filter.doFilter(request, new MockHttpServletResponse(),
                (req, res) -> seen.set((HttpServletRequest) req));
        return seen.get();
    }

    @Test
    void readsAsLoggedOutAndStopsAskingTheStore() throws Exception {
        StoreDown down = new StoreDown(new MockHttpServletRequest(), new RedisConnectionFailureException("down"));
        HttpServletRequest req = pass(down);
        assertThat(req.getSession(false)).isNull();
        assertThat(req.getSession(false)).isNull();
        assertThat(req.isRequestedSessionIdValid()).isFalse();
        assertThat(down.calls).hasValue(1);
    }

    @Test
    void validityCheckFailureAlsoMarksStoreDown() throws Exception {
        StoreDown down = new StoreDown(new MockHttpServletRequest(), new RedisConnectionFailureException("down"));
        HttpServletRequest req = pass(down);
        assertThat(req.isRequestedSessionIdValid()).isFalse();
        assertThat(req.getSession(false)).isNull();
        assertThat(down.calls).hasValue(1);
    }

    @Test
    void creatingASessionIsRefusedAsTemporarilyUnavailable() throws Exception {
        RedisConnectionFailureException cause = new RedisConnectionFailureException("down");
        HttpServletRequest req = pass(new StoreDown(new MockHttpServletRequest(), cause));
        assertThatThrownBy(req::getSession)
                .isInstanceOfSatisfying(SessionUnavailableException.class, e -> {
                    assertThat(e.status().value()).isEqualTo(503);
                    assertThat(e.code()).isEqualTo("TEMPORARILY_UNAVAILABLE");
                    assertThat(e.getCause()).isSameAs(cause);
                });
    }

    @Test
    void otherFailuresAreNotHidden() throws Exception {
        IllegalStateException bug = new IllegalStateException("bug");
        HttpServletRequest req = pass(new StoreDown(new MockHttpServletRequest(), bug));
        assertThatThrownBy(() -> req.getSession(false)).isSameAs(bug);
        assertThatThrownBy(req::isRequestedSessionIdValid).isSameAs(bug);
    }

    @Test
    void healthyStoreIsUntouched() throws Exception {
        MockHttpServletRequest raw = new MockHttpServletRequest();
        HttpServletRequest req = pass(raw);
        assertThat(req.getSession(false)).isNull();
        HttpSession created = req.getSession();
        assertThat(created).isNotNull().isSameAs(raw.getSession(false));
    }

    @Test
    void recognisesStoreFailuresAnywhereInTheCauseChain() {
        assertThat(ResilientSessionFilter.isStoreFailure(new RuntimeException(new RedisConnectionFailureException("x")))).isTrue();
        assertThat(ResilientSessionFilter.isStoreFailure(new RuntimeException(new io.lettuce.core.RedisException("x")))).isTrue();
        assertThat(ResilientSessionFilter.isStoreFailure(new RuntimeException("x"))).isFalse();
    }

    @RestController
    static class SignupLike {
        @PostMapping("/api/needs-session")
        String start(HttpServletRequest request) {
            request.getSession(true).setAttribute("k", "v");
            return "ok";
        }
    }

    @Test
    void controllerNeedingASessionAnswers503InsteadOfServerError() throws Exception {
        Filter storeDown = (req, res, chain) ->
                chain.doFilter(new StoreDown((HttpServletRequest) req, new RedisConnectionFailureException("down")), res);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SignupLike())
                .setControllerAdvice(new GlobalExceptionHandler())
                .addFilters(storeDown, filter)
                .build();
        mvc.perform(post("/api/needs-session"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("TEMPORARILY_UNAVAILABLE"));
    }
}
