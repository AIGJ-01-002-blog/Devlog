package com.team.blog.mcp.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.post.application.PostCommandService;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.error.NotFoundException;
import com.team.blog.shared.jdbc.Columns;
import com.team.blog.shared.time.Times;

/**
 * AI 글 제안과 자정 일기 (061).
 * <p>
 * 글 제안: 서버는 AI의 대화를 읽지 못하므로 "한 주제가 끝났다"는 판단은 연결한 AI가 한다. AI는 propose_post로 제목·쓸 범위·태그를 남기고,
 * 사용자는 대화에서 바로 쓰라고 하거나 devlog 내 글 관리에서 [임시글로 만들기]·[넘기기]를 누른다.
 * <p>
 * 자정 일기: 회원이 설정에서 "자정에 일기 쓰기"를 켜면 AI가 작업 단위마다 add_note로 한두 문장 메모를 남긴다. 매일 00:00(KST)에
 * 전날까지의 메모를 날짜별 일기 임시글 하나로 묶고 메모는 지운다. 메모가 없는 날은 아무것도 만들지 않는다. 일기는 서버 AI를 거치지 않고
 * 주제별 소제목과 시각이 붙은 목록으로 묶는다(동의·비용이 필요 없고 결과가 늘 같다). 발행은 사용자가 한다.
 */
@Service
public class AiJournal {
    private static final Logger log = LoggerFactory.getLogger(AiJournal.class);
    static final ZoneId KST = ZoneId.of("Asia/Seoul");
    static final int MAX_OPEN_PROPOSALS = 20;
    /** 하루 메모 상한. 1,000자 메모가 다 차도 일기 본문이 글 길이 상한(10만 자) 안에 들어가게 잡았다 */
    static final int NOTES_PER_DAY = 60;
    static final int TITLE_MAX = 100;
    static final int SCOPE_MAX = 2000;
    static final int NOTE_MAX = 1000;
    static final int TOPIC_MAX = 50;
    /** 일기로 묶지 못한 메모(정지된 계정 등)는 이만큼 지나면 지운다 */
    static final Duration NOTE_KEEP = Duration.ofDays(7);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm").withZone(KST);

    public enum Status { OPEN, DRAFTED, DISMISSED }

    public record Proposal(long id, String title, String scope, List<String> tags, Status status, Long postId, Instant createdAt) {}

    /** @param todayCount 오늘(KST) 남긴 메모 수 (이번 메모 포함) */
    public record NoteSaved(long id, int todayCount) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final PostCommandService commands;
    private final AiDraftHints hints;
    private final Clock clock;
    private final int maxTags;

    public AiJournal(JdbcTemplate jdbc, TransactionTemplate tx, PostCommandService commands, AiDraftHints hints, Clock clock,
                     BlogProperties props) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.commands = commands;
        this.hints = hints;
        this.clock = clock;
        this.maxTags = props.post().maxTags();
    }

    // ── 자정에 일기 쓰기 설정 ──────────────────────────────

    public boolean diaryEnabled(long memberId) {
        List<Boolean> rows = jdbc.queryForList("SELECT ai_diary_enabled FROM member WHERE id = ?", Boolean.class, memberId);
        if (rows.isEmpty()) throw new NotFoundException();
        return Boolean.TRUE.equals(rows.getFirst());
    }

    /** 끄면 아직 묶지 않은 메모도 지운다. 일기를 원하지 않는 사람의 작업 메모를 남겨 두지 않는다. */
    public boolean setDiaryEnabled(long memberId, boolean on) {
        tx.executeWithoutResult(s -> {
            if (jdbc.update("UPDATE member SET ai_diary_enabled = ? WHERE id = ?", on, memberId) == 0) throw new NotFoundException();
            if (!on) jdbc.update("DELETE FROM ai_note WHERE member_id = ?", memberId);
        });
        return on;
    }

    // ── 글 제안 ──────────────────────────────

    /** 제안을 남긴다. 아직 정하지 않은 같은 제목의 제안이 있으면 범위·태그를 새로 바꾼다. @return 제안 번호 */
    public long propose(long memberId, String rawTitle, String rawScope, List<String> tags) {
        String title = oneLine(rawTitle);
        String scope = rawScope == null ? "" : rawScope.strip();
        if (title.isEmpty() || title.length() > TITLE_MAX) throw ApiException.badRequest("PROPOSAL_TITLE", "제목(title)은 1~" + TITLE_MAX + "자로 적어 주세요.");
        if (scope.isEmpty() || scope.length() > SCOPE_MAX) throw ApiException.badRequest("PROPOSAL_SCOPE", "쓸 범위(scope)는 1~" + SCOPE_MAX + "자로 적어 주세요.");
        String tagText = String.join(",", tags);
        return tx.execute(s -> {
            // 같은 회원의 제안은 한 줄씩 차례로 (상한 검사와 같은 제목 찾기가 겹치지 않게)
            jdbc.queryForList("SELECT id FROM member WHERE id = ? FOR UPDATE", Long.class, memberId);
            List<Long> same = Columns.longs(jdbc, "SELECT id FROM ai_post_proposal WHERE member_id = ? AND status = 'OPEN' AND title = ?",
                    memberId, title);
            if (!same.isEmpty()) {
                jdbc.update("UPDATE ai_post_proposal SET scope = ?, tags = ?, created_at = ? WHERE id = ?",
                        scope, tagText, Timestamp.from(Times.now(clock)), same.getFirst());
                return same.getFirst();
            }
            Integer open = jdbc.queryForObject("SELECT count(*) FROM ai_post_proposal WHERE member_id = ? AND status = 'OPEN'",
                    Integer.class, memberId);
            if (open != null && open >= MAX_OPEN_PROPOSALS) {
                throw ApiException.conflict("PROPOSAL_LIMIT", "아직 정하지 않은 제안이 " + MAX_OPEN_PROPOSALS
                        + "개라 더 남길 수 없어요. 사용자에게 devlog 내 글 관리에서 지난 제안을 정리해 달라고 알려 주세요.");
            }
            return jdbc.queryForObject("""
                    INSERT INTO ai_post_proposal (member_id, title, scope, tags, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id
                    """, Long.class, memberId, title, scope, tagText, Timestamp.from(Times.now(clock)));
        });
    }

    /** 정하지 않은 제안과 최근 30일 안에 임시글로 만든 제안. 최근 순 */
    public List<Proposal> proposals(long memberId, boolean includeDrafted) {
        return jdbc.query("""
                SELECT id, title, scope, tags, status, post_id, created_at FROM ai_post_proposal
                WHERE member_id = ? AND (status = 'OPEN' OR (? AND status = 'DRAFTED' AND decided_at > ?))
                ORDER BY status = 'OPEN' DESC, created_at DESC, id DESC LIMIT 40
                """, (rs, i) -> new Proposal(rs.getLong("id"), rs.getString("title"), rs.getString("scope"), split(rs.getString("tags")),
                Status.valueOf(rs.getString("status")), (Long) rs.getObject("post_id"), rs.getTimestamp("created_at").toInstant()),
                memberId, includeDrafted, Timestamp.from(Times.now(clock).minus(Duration.ofDays(30))));
    }

    public Optional<Proposal> find(long memberId, long id) {
        return jdbc.query("SELECT id, title, scope, tags, status, post_id, created_at FROM ai_post_proposal WHERE id = ? AND member_id = ?",
                (rs, i) -> new Proposal(rs.getLong("id"), rs.getString("title"), rs.getString("scope"), split(rs.getString("tags")),
                        Status.valueOf(rs.getString("status")), (Long) rs.getObject("post_id"), rs.getTimestamp("created_at").toInstant()),
                id, memberId).stream().findFirst();
    }

    /** AI가 제안대로 글을 썼을 때 (create_draft의 proposal_id). 이미 정한 제안이면 그대로 둔다. */
    public void markDrafted(long memberId, long id, long postId) {
        jdbc.update("UPDATE ai_post_proposal SET status = 'DRAFTED', post_id = ?, decided_at = ? WHERE id = ? AND member_id = ? AND status = 'OPEN'",
                postId, Timestamp.from(Times.now(clock)), id, memberId);
    }

    /**
     * 내 글 관리의 [임시글로 만들기]. 제목과 쓸 범위를 뼈대로 한 임시글을 만들고 제안한 태그를 발행 창에 미리 채운다.
     * 먼저 제안을 잡고(OPEN → DRAFTED) 글을 만들어, 두 번 눌러도 임시글은 하나다. 이미 만든 제안이면 그 글 번호를 돌려준다.
     */
    public long draft(long memberId, long id) {
        return tx.execute(s -> {
            Proposal p = jdbc.query("""
                    UPDATE ai_post_proposal SET status = 'DRAFTED', decided_at = ? WHERE id = ? AND member_id = ? AND status = 'OPEN'
                    RETURNING id, title, scope, tags, status, post_id, created_at
                    """, (rs, i) -> new Proposal(rs.getLong("id"), rs.getString("title"), rs.getString("scope"), split(rs.getString("tags")),
                    Status.OPEN, null, rs.getTimestamp("created_at").toInstant()), Timestamp.from(Times.now(clock)), id, memberId)
                    .stream().findFirst().orElse(null);
            if (p == null) {
                Proposal done = find(memberId, id).orElseThrow(NotFoundException::new);
                if (done.status() == Status.DRAFTED && done.postId() != null) return done.postId();
                throw ApiException.conflict("PROPOSAL_CLOSED", "이미 넘긴 제안이에요.");
            }
            long postId = commands.create(memberId, p.title(), outline(p)).id();
            if (!p.tags().isEmpty()) hints.suggestTags(postId, p.tags());
            jdbc.update("UPDATE ai_post_proposal SET post_id = ? WHERE id = ?", postId, id);
            return postId;
        });
    }

    public void dismiss(long memberId, long id) {
        int changed = jdbc.update("UPDATE ai_post_proposal SET status = 'DISMISSED', decided_at = ? WHERE id = ? AND member_id = ? AND status = 'OPEN'",
                Timestamp.from(Times.now(clock)), id, memberId);
        if (changed == 0 && find(memberId, id).isEmpty()) throw new NotFoundException();
    }

    /** 제안으로 만든 임시글의 첫 본문. 사용자가 직접 쓰거나 AI에게 이어 쓰게 한다 */
    static String outline(Proposal p) {
        return "## 쓸 범위\n\n" + p.scope() + "\n";
    }

    // ── 하루 메모와 자정 일기 ──────────────────────────────

    public NoteSaved addNote(long memberId, String rawTopic, String rawContent, List<String> tags) {
        String content = rawContent == null ? "" : rawContent.strip();
        String topic = oneLine(rawTopic);
        if (content.isEmpty() || content.length() > NOTE_MAX) throw ApiException.badRequest("NOTE_CONTENT", "메모(content)는 1~" + NOTE_MAX + "자로 적어 주세요.");
        if (topic.length() > TOPIC_MAX) throw ApiException.badRequest("NOTE_TOPIC", "주제(topic)는 " + TOPIC_MAX + "자까지 적어 주세요.");
        Instant now = Times.now(clock);
        Timestamp today = Timestamp.from(LocalDate.ofInstant(now, KST).atStartOfDay(KST).toInstant());
        return tx.execute(s -> {
            if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT ai_diary_enabled FROM member WHERE id = ? FOR UPDATE", Boolean.class, memberId))) {
                throw ApiException.conflict("AI_DIARY_OFF", AI_DIARY_OFF);
            }
            Integer count = jdbc.queryForObject("SELECT count(*) FROM ai_note WHERE member_id = ? AND created_at >= ?", Integer.class, memberId, today);
            int n = count == null ? 0 : count;
            if (n >= NOTES_PER_DAY) {
                throw ApiException.conflict("NOTE_LIMIT", "메모는 하루 " + NOTES_PER_DAY + "개까지 남길 수 있어요. 오늘은 여기까지 모아 둘게요.");
            }
            Long id = jdbc.queryForObject("INSERT INTO ai_note (member_id, topic, content, tags, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
                    Long.class, memberId, topic.isEmpty() ? null : topic, content, String.join(",", tags), Timestamp.from(now));
            return new NoteSaved(id, n + 1);
        });
    }

    static final String AI_DIARY_OFF = "자정에 일기 쓰기가 꺼져 있어요. 사용자가 devlog 설정 › AI 연결에서 '자정에 일기 쓰기'를 켜야 메모를 남길 수 있어요.";

    /**
     * 자정 작업 본체. 오늘(KST) 0시 전에 남긴 메모를 회원·날짜별 일기 임시글로 묶는다. 쉬는 동안 놓친 날도 날짜마다 따로 만든다.
     * 메모는 꺼내면서 지우므로(DELETE … RETURNING) 두 번 돌아도 일기는 한 번만 생긴다. 회원 한 명이 실패해도 나머지는 계속한다.
     * @return 만든 일기 수
     */
    public int compileDiaries() {
        Instant now = Times.now(clock);
        Instant today = LocalDate.ofInstant(now, KST).atStartOfDay(KST).toInstant();
        List<Long> members = Columns.longs(jdbc, """
                SELECT DISTINCT n.member_id FROM ai_note n JOIN member m ON m.id = n.member_id
                WHERE n.created_at < ? AND m.ai_diary_enabled AND m.status = 'ACTIVE' AND m.deleted_at IS NULL
                """, Timestamp.from(today));
        int made = 0;
        for (long memberId : members) {
            try {
                Integer n = tx.execute(s -> compile(memberId, today, now));
                made += n == null ? 0 : n;
            } catch (RuntimeException e) {
                log.warn("회원 {}의 자정 일기를 만들지 못했습니다. 메모는 남겨 두고 다음 자정에 다시 묶습니다: {}", memberId, e.getMessage());
            }
        }
        // 묶지 못한 채 오래된 메모(정지된 계정 등)는 지운다
        jdbc.update("DELETE FROM ai_note WHERE created_at < ?", Timestamp.from(now.minus(NOTE_KEEP)));
        if (made > 0) log.info("자정 일기 {}개를 임시글로 만들었습니다", made);
        return made;
    }

    record Note(String topic, String content, List<String> tags, Instant at) {}

    private int compile(long memberId, Instant before, Instant now) {
        List<Note> notes = jdbc.query("DELETE FROM ai_note WHERE member_id = ? AND created_at < ? RETURNING topic, content, tags, created_at",
                (rs, i) -> new Note(rs.getString("topic"), rs.getString("content"), split(rs.getString("tags")),
                        rs.getTimestamp("created_at").toInstant()), memberId, Timestamp.from(before));
        Map<LocalDate, List<Note>> byDay = new TreeMap<>();
        Instant oldest = now.minus(NOTE_KEEP);
        for (Note n : notes) {
            if (n.at().isBefore(oldest)) continue;
            byDay.computeIfAbsent(LocalDate.ofInstant(n.at(), KST), d -> new ArrayList<>()).add(n);
        }
        for (Map.Entry<LocalDate, List<Note>> day : byDay.entrySet()) {
            List<Note> list = day.getValue();
            list.sort((a, b) -> a.at().compareTo(b.at()));
            long postId = commands.create(memberId, diaryTitle(day.getKey()), diaryBody(list)).id();
            Set<String> tags = new LinkedHashSet<>();
            for (Note n : list) for (String t : n.tags()) if (tags.size() < maxTags) tags.add(t);
            if (!tags.isEmpty()) hints.suggestTags(postId, List.copyOf(tags));
        }
        return byDay.size();
    }

    static String diaryTitle(LocalDate day) {
        return day + " 개발 일기";
    }

    /** 주제가 처음 나온 차례대로 소제목을 달고, 그 아래에 시각과 메모를 단다. 주제 없는 메모는 맨 끝 "그 밖에"로 */
    static String diaryBody(List<Note> notes) {
        Map<String, List<Note>> byTopic = new LinkedHashMap<>();
        for (Note n : notes) byTopic.computeIfAbsent(n.topic() == null ? "" : n.topic(), t -> new ArrayList<>()).add(n);
        List<Note> rest = byTopic.remove("");
        if (rest != null) byTopic.put("", rest);
        StringBuilder out = new StringBuilder();
        for (Map.Entry<String, List<Note>> e : byTopic.entrySet()) {
            if (!out.isEmpty()) out.append('\n');
            out.append("## ").append(e.getKey().isEmpty() ? (byTopic.size() == 1 ? "오늘 한 일" : "그 밖에") : e.getKey()).append("\n\n");
            for (Note n : e.getValue()) {
                // 여러 줄 메모는 목록 항목 안에 들여 써서 한 항목으로 둔다
                out.append("- ").append(TIME.format(n.at())).append(' ').append(n.content().replace("\n", "\n  ")).append('\n');
            }
        }
        return out.toString();
    }

    /** 탈퇴 정리 (020) */
    public void deleteAll(long memberId) {
        jdbc.update("DELETE FROM ai_note WHERE member_id = ?", memberId);
        jdbc.update("DELETE FROM ai_post_proposal WHERE member_id = ?", memberId);
    }

    private static String oneLine(String raw) {
        return raw == null ? "" : raw.replaceAll("\\s+", " ").strip();
    }

    private static List<String> split(String tags) {
        return tags == null || tags.isEmpty() ? List.of() : Arrays.asList(tags.split(","));
    }
}
