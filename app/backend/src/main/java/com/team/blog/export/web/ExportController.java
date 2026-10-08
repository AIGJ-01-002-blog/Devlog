package com.team.blog.export.web;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.team.blog.export.application.PostExporter;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.shared.web.RateLimiter;

/** 내 글 내보내기 (056). 내 글 전체를 읽는 무거운 요청이라 회원마다 10분에 5번까지 받는다. */
@RestController
public class ExportController {
    static final int LIMIT = 5;
    static final Duration WINDOW = Duration.ofMinutes(10);

    private final PostExporter exporter;
    private final RateLimiter limiter;

    public ExportController(PostExporter exporter, RateLimiter limiter) {
        this.exporter = exporter;
        this.limiter = limiter;
    }

    public record Summary(int posts) {}

    @GetMapping("/api/me/export")
    public ResponseEntity<Summary> summary(@CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Summary(exporter.count(me.id())));
    }

    @GetMapping("/api/me/export.zip")
    public ResponseEntity<StreamingResponseBody> download(@CurrentMember MemberPrincipal me) {
        limiter.check("export:" + me.id(), LIMIT, WINDOW);
        String file = "devlog-" + me.handle() + "-" + LocalDate.now(ZoneId.of("Asia/Seoul")) + ".zip";
        StreamingResponseBody body = out -> exporter.writeZip(me.id(), out);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file).build().toString())
                .body(body);
    }
}
