package com.team.blog.inquiry.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.inquiry.application.InquiryCategory;
import com.team.blog.inquiry.application.InquiryService;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/** 문의 관리 (054). `/api/admin/**`는 보안 설정이 관리자만 들이고, 여기서도 역할을 다시 확인한다. */
@RestController
@RequestMapping("/api/admin/inquiries")
public class AdminInquiryController {
    private final InquiryService inquiries;

    public AdminInquiryController(InquiryService inquiries) {
        this.inquiries = inquiries;
    }

    /** @param tab open(접수·처리 중) / done(해결·닫힘) */
    @GetMapping
    public ResponseEntity<InquiryService.Page> list(@RequestParam(defaultValue = "open") String tab,
                                                    @RequestParam(required = false) String category,
                                                    @RequestParam(required = false) Long before, @CurrentMember MemberPrincipal me) {
        admin(me);
        InquiryCategory c = InquiryCategory.parse(category).orElse(null);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(inquiries.list(!"done".equalsIgnoreCase(tab), c, before));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InquiryService.Item> detail(@PathVariable long id, @CurrentMember MemberPrincipal me) {
        admin(me);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(inquiries.detail(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<InquiryService.Item> update(@PathVariable long id, @RequestBody InquiryService.Update body,
                                                      @CurrentMember MemberPrincipal me) {
        admin(me);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(inquiries.update(me.id(), id, body));
    }

    private static void admin(MemberPrincipal me) {
        if (!me.isAdmin()) throw new NotFoundException();
    }
}
