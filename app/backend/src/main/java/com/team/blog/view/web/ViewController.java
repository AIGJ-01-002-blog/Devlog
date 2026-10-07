package com.team.blog.view.web;

import java.time.Duration;
import java.util.UUID;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.shared.web.ClientIpResolver;
import com.team.blog.view.application.ViewRecorder;

/**
 * 조회 기록 (spec 013, docs/40 §4). 글이 화면에 1초 이상 보이면 화면이 한 번 보낸다. 비회원도 보낼 수 있고 CSRF 값은 함께 온다.
 * 셌든 안 셌든 같은 204를 준다(FR-017). 볼 수 없는 글만 상세와 같은 404다.
 */
@RestController
public class ViewController {
    public static final String VISITOR_COOKIE = "vid";
    private static final Duration VISITOR_TTL = Duration.ofDays(365);

    private final ViewRecorder recorder;
    private final ClientIpResolver ipResolver;
    private final boolean secureCookie;

    public ViewController(ViewRecorder recorder, ClientIpResolver ipResolver,
                          @Value("${server.servlet.session.cookie.secure:false}") boolean secureCookie) {
        this.recorder = recorder;
        this.ipResolver = ipResolver;
        this.secureCookie = secureCookie;
    }

    @PostMapping("/api/posts/{postId}/views")
    public ResponseEntity<Void> record(@PathVariable String postId, @CurrentMember(required = false) MemberPrincipal me,
                                       HttpServletRequest request) {
        if (postId == null || !postId.matches("[1-9][0-9]{0,17}")) throw new NotFoundException();
        String visitorId = cookie(request, VISITOR_COOKIE);
        // 첫 방문 비회원에게 무작위 방문자 값을 준다: 1년, 스크립트로 못 읽음, 보안 연결에서만 (FR-005)
        String issued = me == null && visitorId == null ? UUID.randomUUID().toString() : null;
        recorder.record(Long.parseLong(postId), new ViewRecorder.Visit(me == null ? null : me.id(), me != null && me.isAdmin(),
                visitorId, issued, ipResolver.resolve(request), request.getHeader("User-Agent"), isPrefetch(request)));
        ResponseEntity.HeadersBuilder<?> res = ResponseEntity.noContent().cacheControl(CacheControl.noStore());
        if (issued != null) {
            res.header("Set-Cookie", ResponseCookie.from(VISITOR_COOKIE, issued).maxAge(VISITOR_TTL)
                    .httpOnly(true).secure(secureCookie || request.isSecure()).sameSite("Lax").path("/").build().toString());
        }
        return res.build();
    }

    private static boolean isPrefetch(HttpServletRequest request) {
        String purpose = request.getHeader("Sec-Purpose");
        if (purpose == null) purpose = request.getHeader("Purpose");
        if (purpose == null) purpose = request.getHeader("X-Moz");
        return purpose != null && purpose.toLowerCase().contains("prefetch");
    }

    private static String cookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) if (name.equals(c.getName())) return c.getValue();
        return null;
    }
}
