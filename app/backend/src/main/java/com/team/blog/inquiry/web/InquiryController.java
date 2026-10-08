package com.team.blog.inquiry.web;

import java.util.List;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.inquiry.application.InquiryService;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/**
 * 문의·신고 접수와 내 문의 (054). 로그인한 회원만. 이메일 인증 전에도 남길 수 있다(인증 메일이 안 온다는 문의도 받아야 하므로).
 * 정지된 계정은 계정 상태 필터가 쓰기를 막는다.
 */
@RestController
public class InquiryController {
    private final InquiryService inquiries;

    public InquiryController(InquiryService inquiries) {
        this.inquiries = inquiries;
    }

    @PostMapping("/api/inquiries")
    public ResponseEntity<Map<String, Long>> submit(@RequestBody InquiryService.Submit body, @CurrentMember MemberPrincipal me) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", inquiries.submit(me.id(), body)));
    }

    @GetMapping("/api/me/inquiries")
    public ResponseEntity<Map<String, List<InquiryService.Item>>> mine(@CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("items", inquiries.mine(me.id())));
    }
}
