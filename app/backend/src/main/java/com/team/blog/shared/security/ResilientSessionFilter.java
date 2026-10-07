package com.team.blog.shared.security;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Redis 세션 저장소가 멈췄을 때 세션을 읽지 못한 요청을 비로그인으로 처리한다 (docs/02 §2-1, 001 FR-020).
 * Spring Session 필터 바로 뒤에 둔다. 세션을 새로 만들어야 하는 요청(로그인 등)은 {@link SessionUnavailableException}.
 */
public class ResilientSessionFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(ResilientSessionFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        chain.doFilter(new Wrapper(request), response);
    }

    static boolean isStoreFailure(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof DataAccessException) return true;
            String name = t.getClass().getName();
            if (name.startsWith("io.lettuce") || name.startsWith("org.springframework.data.redis")) return true;
        }
        return false;
    }

    private static final class Wrapper extends HttpServletRequestWrapper {
        private boolean storeDown;

        Wrapper(HttpServletRequest request) {
            super(request);
        }

        @Override
        public HttpSession getSession(boolean create) {
            if (storeDown && !create) return null;
            try {
                return super.getSession(create);
            } catch (RuntimeException e) {
                if (!isStoreFailure(e)) throw e;
                storeDown = true;
                log.warn("세션 저장소를 읽을 수 없어 비로그인으로 처리합니다: {}", e.getMessage());
                if (create) throw new SessionUnavailableException(e);
                return null;
            }
        }

        @Override
        public HttpSession getSession() {
            return getSession(true);
        }

        @Override
        public boolean isRequestedSessionIdValid() {
            if (storeDown) return false;
            try {
                return super.isRequestedSessionIdValid();
            } catch (RuntimeException e) {
                if (!isStoreFailure(e)) throw e;
                storeDown = true;
                return false;
            }
        }
    }

    public static class SessionUnavailableException extends RuntimeException {
        public SessionUnavailableException(Throwable cause) {
            super("세션 저장소를 사용할 수 없어요", cause);
        }
    }
}
