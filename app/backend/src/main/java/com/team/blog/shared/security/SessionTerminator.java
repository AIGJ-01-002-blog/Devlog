package com.team.blog.shared.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

/**
 * 한 회원의 로그인 상태(세션)를 끊는다 (004 FR-025·FR-032). 세션 저장소는 회원 번호(인증 이름)로 색인되어 있다
 * (spring.session.data.redis.repository-type=indexed).
 */
@Component
public class SessionTerminator {
    private static final Logger log = LoggerFactory.getLogger(SessionTerminator.class);
    private final FindByIndexNameSessionRepository<? extends Session> sessions;

    public SessionTerminator(FindByIndexNameSessionRepository<? extends Session> sessions) {
        this.sessions = sessions;
    }

    /**
     * @param keepSessionId 남길 세션 (지금 기기). 모두 끊으려면 null
     * @return 끊은 세션 수
     */
    public int terminate(long memberId, String keepSessionId) {
        int n = 0;
        for (String id : sessions.findByPrincipalName(String.valueOf(memberId)).keySet()) {
            if (id.equals(keepSessionId)) continue;
            sessions.deleteById(id);
            n++;
        }
        log.info("회원 {}의 다른 로그인 {}개를 끊었습니다", memberId, n);
        return n;
    }
}
