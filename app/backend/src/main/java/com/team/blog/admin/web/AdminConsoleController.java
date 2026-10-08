package com.team.blog.admin.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.account.application.RoleService;
import com.team.blog.admin.application.AdminStats;
import com.team.blog.moderation.application.ModerationService;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/**
 * 관리자 페이지 (062): 대시보드 통계, 회원 목록·회원별 통계·권한, 글 목록·숨기기. 관리자·매니저만 쓰고(일반 회원 404),
 * 권한 바꾸기는 관리자만 한다(매니저는 403).
 */
@RestController
@RequestMapping("/api/admin")
public class AdminConsoleController {
    private final AdminStats stats;
    private final RoleService roles;
    private final ModerationService moderation;

    public AdminConsoleController(AdminStats stats, RoleService roles, ModerationService moderation) {
        this.stats = stats;
        this.roles = roles;
        this.moderation = moderation;
    }

    public record RoleRequest(String role) {}

    public record RoleResult(String handle, String role) {}

    public record HideRequest(String reason) {}

    @GetMapping("/dashboard")
    public ResponseEntity<AdminStats.Dashboard> dashboard(@RequestParam(defaultValue = "30") int days, @CurrentMember MemberPrincipal me) {
        staff(me);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(stats.dashboard(days));
    }

    @GetMapping("/members")
    public ResponseEntity<AdminStats.MemberPage> members(@RequestParam(required = false) String q, @RequestParam(required = false) String role,
                                                         @RequestParam(required = false) String status,
                                                         @RequestParam(defaultValue = "1") int page, @CurrentMember MemberPrincipal me) {
        staff(me);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(stats.memberPage(q, role, status, page));
    }

    @GetMapping("/members/{handle}/stats")
    public ResponseEntity<AdminStats.MemberDetail> memberStats(@PathVariable String handle, @CurrentMember MemberPrincipal me) {
        staff(me);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(stats.memberDetail(handle));
    }

    @PutMapping("/members/{handle}/role")
    public ResponseEntity<RoleResult> role(@PathVariable String handle, @RequestBody RoleRequest body, @CurrentMember MemberPrincipal me) {
        staff(me);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new RoleResult(handle, roles.change(me.id(), handle, body == null ? null : body.role()).name()));
    }

    @GetMapping("/posts")
    public ResponseEntity<AdminStats.PostPage> posts(@RequestParam(required = false) String q, @RequestParam(required = false) String filter,
                                                     @RequestParam(required = false) String author,
                                                     @RequestParam(defaultValue = "1") int page, @CurrentMember MemberPrincipal me) {
        staff(me);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(stats.postPage(q, filter, author, page));
    }

    @PostMapping("/posts/{postId}/hide")
    public ResponseEntity<Void> hide(@PathVariable long postId, @RequestBody HideRequest body, @CurrentMember MemberPrincipal me) {
        staff(me);
        moderation.hidePost(me.id(), postId, body == null ? null : body.reason());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posts/{postId}/unhide")
    public ResponseEntity<Void> unhide(@PathVariable long postId, @CurrentMember MemberPrincipal me) {
        staff(me);
        moderation.unhidePost(me.id(), postId);
        return ResponseEntity.noContent().build();
    }

    private static void staff(MemberPrincipal me) {
        if (!me.isStaff()) throw new NotFoundException();
    }
}
