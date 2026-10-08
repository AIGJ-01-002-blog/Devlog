package com.team.blog.moderation.web;

import java.util.Locale;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.moderation.application.AdminReportQuery;
import com.team.blog.moderation.application.ModerationService;
import com.team.blog.moderation.application.SuspensionAdminService;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/**
 * 관리자 API (019 FR-011·FR-044). `/api/admin/**`는 보안 설정이 관리자·매니저(062)만 들이고, 일반 회원은 404, 비회원은 401이다.
 * 여기서도 역할을 다시 확인한다(서버가 매번 확인).
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminReportQuery query;
    private final ModerationService moderation;
    private final SuspensionAdminService suspensions;

    public AdminController(AdminReportQuery query, ModerationService moderation, SuspensionAdminService suspensions) {
        this.query = query;
        this.moderation = moderation;
        this.suspensions = suspensions;
    }

    public record ResolveRequest(String action, String reason, SuspendRequest suspend) {}

    /** @param days 1·7·30, 없으면 영구 */
    public record SuspendRequest(Integer days, String reason) {}

    @GetMapping("/reports")
    public ResponseEntity<AdminReportQuery.Page> reports(@RequestParam(defaultValue = "pending") String tab,
                                                         @RequestParam(required = false) String cursor, @CurrentMember MemberPrincipal me) {
        admin(me);
        AdminReportQuery.Tab t = "handled".equalsIgnoreCase(tab) ? AdminReportQuery.Tab.HANDLED : AdminReportQuery.Tab.PENDING;
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(query.list(t, cursor));
    }

    @GetMapping("/reports/{caseId}")
    public ResponseEntity<AdminReportQuery.Detail> report(@PathVariable long caseId, @CurrentMember MemberPrincipal me) {
        admin(me);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(query.detail(caseId, me.id()));
    }

    /** 숨기기·반려 (FR-015). 처리 화면에서 정지를 함께 할 수 있다(US4 AS-7). 정지가 실패해도 처리는 이미 끝났다. */
    @PostMapping("/reports/{caseId}/resolve")
    public ResponseEntity<AdminReportQuery.Detail> resolve(@PathVariable long caseId, @RequestBody ResolveRequest body,
                                                           @CurrentMember MemberPrincipal me) {
        admin(me);
        ModerationService.Action action = body.action() == null ? null : parse(body.action());
        moderation.resolve(me.id(), caseId, action, body.reason());
        if (body.suspend() != null) {
            String handle = query.detail(caseId, me.id()).author().handle();
            suspensions.suspend(me.id(), handle, body.suspend().days(), body.suspend().reason());
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(query.detail(caseId, me.id()));
    }

    @PostMapping("/reports/{caseId}/unhide")
    public ResponseEntity<AdminReportQuery.Detail> unhide(@PathVariable long caseId, @CurrentMember MemberPrincipal me) {
        admin(me);
        moderation.unhide(me.id(), caseId);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(query.detail(caseId, me.id()));
    }

    @GetMapping("/members/{handle}")
    public ResponseEntity<AdminReportQuery.AuthorInfo> member(@PathVariable String handle, @CurrentMember MemberPrincipal me) {
        admin(me);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(query.member(handle));
    }

    @PostMapping("/members/{handle}/suspension")
    public ResponseEntity<AdminReportQuery.AuthorInfo> suspend(@PathVariable String handle, @RequestBody SuspendRequest body,
                                                               @CurrentMember MemberPrincipal me) {
        admin(me);
        suspensions.suspend(me.id(), handle, body.days(), body.reason());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(query.member(handle));
    }

    @DeleteMapping("/members/{handle}/suspension")
    public ResponseEntity<AdminReportQuery.AuthorInfo> lift(@PathVariable String handle, @CurrentMember MemberPrincipal me) {
        admin(me);
        suspensions.lift(me.id(), handle);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(query.member(handle));
    }

    private static void admin(MemberPrincipal me) {
        if (!me.isStaff()) throw new NotFoundException();
    }

    private static ModerationService.Action parse(String raw) {
        try {
            return ModerationService.Action.valueOf(raw.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
