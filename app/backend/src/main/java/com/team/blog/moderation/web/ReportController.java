package com.team.blog.moderation.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.moderation.application.ReportService;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/**
 * 신고 (019 US1). 처음 신고든 같은 대기 사건에 다시 한 신고든 같은 204다(FR-003). 비회원은 401, 이메일 인증 전은 403(계정 상태 필터).
 * 응답에는 사건·신고 번호를 싣지 않는다.
 */
@RestController
public class ReportController {
    private final ReportService reports;

    public ReportController(ReportService reports) {
        this.reports = reports;
    }

    @PostMapping("/api/reports")
    public ResponseEntity<Void> report(@RequestBody ReportService.Command body, @CurrentMember MemberPrincipal me) {
        reports.report(me.id(), body);
        return ResponseEntity.noContent().build();
    }
}
