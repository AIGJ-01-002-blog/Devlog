package com.team.blog.mcp.web;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.mcp.application.AiJournal;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/**
 * 설정의 "자정에 일기 쓰기"와 내 글 관리의 AI 글 제안 (061). 로그인 세션 + CSRF로만 부른다.
 * AI가 스스로 일기를 켜거나 제안을 정하지 못하게 MCP 도구로는 열어 두지 않는다.
 */
@RestController
public class AiJournalController {
    private final AiJournal journal;

    public AiJournalController(AiJournal journal) {
        this.journal = journal;
    }

    /** @param enabled true면 연결한 AI가 메모를 남기고 매일 자정에 일기 임시글로 묶인다 */
    public record AiDiarySetting(Boolean enabled) {}

    public record ProposalView(long id, String title, String scope, List<String> tags, Instant createdAt) {}

    @GetMapping("/api/me/ai-diary")
    public ResponseEntity<AiDiarySetting> diary(@CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new AiDiarySetting(journal.diaryEnabled(me.id())));
    }

    @PutMapping("/api/me/ai-diary")
    public AiDiarySetting setDiary(@CurrentMember MemberPrincipal me, @RequestBody AiDiarySetting body) {
        if (body == null || body.enabled() == null) throw ApiException.badRequest("INVALID_REQUEST", "켤지 끌지(enabled)를 보내 주세요.");
        return new AiDiarySetting(journal.setDiaryEnabled(me.id(), body.enabled()));
    }

    /** 아직 정하지 않은 제안만. 최근 순 */
    @GetMapping("/api/me/ai-proposals")
    public ResponseEntity<List<ProposalView>> proposals(@CurrentMember MemberPrincipal me) {
        List<ProposalView> out = journal.proposals(me.id(), false).stream()
                .map(p -> new ProposalView(p.id(), p.title(), p.scope(), p.tags(), p.createdAt())).toList();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(out);
    }

    /** [임시글로 만들기]. 만든(또는 이미 만든) 임시글 번호를 돌려준다 */
    @PostMapping("/api/me/ai-proposals/{id}/draft")
    public Map<String, Long> draft(@CurrentMember MemberPrincipal me, @PathVariable long id) {
        return Map.of("postId", journal.draft(me.id(), id));
    }

    /** [넘기기] */
    @PostMapping("/api/me/ai-proposals/{id}/dismiss")
    public ResponseEntity<Void> dismiss(@CurrentMember MemberPrincipal me, @PathVariable long id) {
        journal.dismiss(me.id(), id);
        return ResponseEntity.noContent().build();
    }
}
